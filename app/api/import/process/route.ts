// app/api/import/process/route.ts
// Queue import job instead of processing synchronously
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { generateDedupeHash, processImportJobStep } from '@/lib/jobs/importProcessor';
import { checkImportLimit, incrementLimit } from '@/lib/limits';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check import limit
    const limitCheck = await checkImportLimit(user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || 'Import limit reached' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { importId, fileData, selectedConversationIds, projectId, newProject } = body;

    if (!importId || !fileData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!selectedConversationIds || selectedConversationIds.length === 0) {
      return NextResponse.json({ error: 'No conversations selected' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Normalize fileData to array (handle different JSON structures)
    let conversationArray: any[] = [];
    if (Array.isArray(fileData)) {
      conversationArray = fileData;
    } else if (fileData && typeof fileData === 'object' && Array.isArray(fileData.conversations)) {
      conversationArray = fileData.conversations;
    } else if (fileData && typeof fileData === 'object' && (fileData.mapping || fileData.title || fileData.id || fileData.conversation_id)) {
      // Single conversation object
      conversationArray = [fileData];
    } else {
      return NextResponse.json({ error: 'Invalid file format: expected array of conversations or object with conversations property' }, { status: 400 });
    }

    // Parse to estimate size for sync vs async decision
    const { parseChatGPTExport } = await import('@/lib/parsers/chatgpt');
    const parsedConversations = parseChatGPTExport(conversationArray);
    const conversationsToImport = parsedConversations.filter((conv) =>
      selectedConversationIds.includes(conv.id)
    );

    if (conversationsToImport.length === 0) {
      return NextResponse.json({ error: 'No conversations selected' }, { status: 400 });
    }

    // Estimate total size: count messages and approximate chars
    let totalMessages = 0;
    let totalChars = 0;
    for (const conv of conversationsToImport) {
      // Check individual conversation size
      let convChars = 0;
      for (const msg of conv.messages) {
        convChars += msg.content.length;
      }
      // Check if any single conversation exceeds limit
      const { checkConversationSize } = await import('@/lib/limits');
      const sizeCheck = checkConversationSize(
        conv.messages.map((m) => m.content).join('\n')
      );
      if (!sizeCheck.allowed) {
        return NextResponse.json(
          {
            error: sizeCheck.message || `Conversation "${conv.title || 'Untitled'}" is too large`,
          },
          { status: 400 }
        );
      }
      totalMessages += conv.messages.length;
      totalChars += convChars;
    }

    // Estimate chunks (rough: ~500 chars per chunk)
    const estimatedChunks = Math.ceil(totalChars / 500);

    // Process synchronously for small-to-medium imports
    // Threshold: <= 10 conversations AND <= 200 messages AND <= 500 chunks
    // This covers most typical use cases (1-10 conversations) while still being fast
    // Only queue for truly large imports (many conversations or very long conversations)
    const shouldProcessSync = 
      conversationsToImport.length <= 10 && 
      totalMessages <= 200 && 
      estimatedChunks <= 500;

    if (shouldProcessSync) {
      // Process synchronously - much faster for small-to-medium imports
      const { chunkText } = await import('@/lib/chunking');
      const { embedTexts } = await import('@/lib/ai/embeddings');
      
      // Handle project creation if needed
      let finalProjectId = projectId;
      if (newProject && newProject.name) {
        const { data: newProjectData, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: newProject.name,
            description: newProject.description || null,
          })
          .select()
          .single();

        if (projectError || !newProjectData) {
          return NextResponse.json({ error: `Failed to create project: ${projectError?.message || 'Unknown error'}` }, { status: 500 });
        }
        finalProjectId = newProjectData.id;
      }

      // Process all conversations synchronously
      const conversationIds: string[] = [];
      let totalMessagesInserted = 0;
      let totalChunksInserted = 0;
      let totalEmbedded = 0;

      // Update import status
      await supabase
        .from('imports')
        .update({
          status: 'processing',
          progress_json: {
            percent: 10,
            counts: { conversations: 0, messages: 0, chunks: 0, embedded: 0 },
          },
        })
        .eq('id', importId);

      // Process each conversation
      for (let i = 0; i < conversationsToImport.length; i++) {
        const conv = conversationsToImport[i];
        const progressPercent = 10 + Math.floor((i / conversationsToImport.length) * 80);

        // Create conversation
        const startedAt = conv.startedAt instanceof Date ? conv.startedAt : new Date(conv.startedAt || Date.now());
        const endedAt = conv.endedAt instanceof Date ? conv.endedAt : (conv.endedAt ? new Date(conv.endedAt) : null);
        
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            import_id: importId,
            title: conv.title,
            source: 'chatgpt',
            started_at: startedAt.toISOString(),
            ended_at: endedAt?.toISOString() || null,
          })
          .select()
          .single();

        if (convError || !conversation) {
          await supabase.from('imports').update({ status: 'error', error_message: convError?.message || 'Failed to create conversation' }).eq('id', importId);
          return NextResponse.json({ error: `Failed to create conversation: ${convError?.message || 'Unknown error'}` }, { status: 500 });
        }

        conversationIds.push(conversation.id);

        // Link to project if specified
        if (finalProjectId) {
          await supabase.from('project_conversations').upsert({
            project_id: finalProjectId,
            conversation_id: conversation.id,
          });
        }

        // Insert messages
        const messagesToInsert = conv.messages.map((msg: any, index: number) => ({
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
          index_in_conversation: index,
          source_message_id: msg.source_message_id || null,
          raw_payload: msg.raw_payload || null,
        }));

        const { error: messagesError } = await supabase.from('messages').insert(messagesToInsert);
        if (messagesError) {
          await supabase.from('imports').update({ status: 'error', error_message: messagesError.message }).eq('id', importId);
          return NextResponse.json({ error: `Failed to insert messages: ${messagesError.message}` }, { status: 500 });
        }

        totalMessagesInserted += messagesToInsert.length;

        await supabase.from('imports').update({
          progress_json: {
            percent: progressPercent,
            counts: { conversations: i + 1, messages: totalMessagesInserted, chunks: totalChunksInserted, embedded: totalEmbedded },
          },
        }).eq('id', importId);

        // Chunk and embed for this conversation
        const { data: messages } = await supabase
          .from('messages')
          .select('id, content')
          .eq('conversation_id', conversation.id)
          .order('index_in_conversation');

        if (messages && messages.length > 0) {
          const allChunks: Array<{ message_id: string; conversation_id: string; content: string; chunk_index: number }> = [];
          
          for (const message of messages) {
            if (!message.content || message.content.trim().length === 0) continue;
            const chunks = chunkText(message.content);
            for (const chunk of chunks) {
              allChunks.push({
                message_id: message.id,
                conversation_id: conversation.id,
                content: chunk.content,
                chunk_index: chunk.chunkIndex,
              });
            }
          }

          if (allChunks.length > 0) {
            const chunksToInsert = allChunks.map((chunk) => ({
              user_id: user.id,
              conversation_id: chunk.conversation_id,
              message_id: chunk.message_id,
              content: chunk.content,
              chunk_index: chunk.chunk_index,
            }));

            const { data: insertedChunks, error: chunksError } = await supabase
              .from('message_chunks')
              .insert(chunksToInsert)
              .select();

            if (chunksError || !insertedChunks) {
              await supabase.from('imports').update({ status: 'error', error_message: chunksError?.message || 'Failed to insert chunks' }).eq('id', importId);
              return NextResponse.json({ error: `Failed to insert chunks: ${chunksError?.message || 'Unknown error'}` }, { status: 500 });
            }

            totalChunksInserted += insertedChunks.length;

            // Embed chunks in batches
            const chunkContents = insertedChunks.map((c: any) => c.content);
            const embeddings = await embedTexts(chunkContents);

            const embeddingsToInsert = insertedChunks.map((chunk: any, idx: number) => ({
              chunk_id: chunk.id,
              embedding: embeddings[idx],
            }));

            const { error: embeddingsError } = await supabase
              .from('message_chunk_embeddings')
              .insert(embeddingsToInsert);

            if (embeddingsError) {
              await supabase.from('imports').update({ status: 'error', error_message: embeddingsError.message }).eq('id', importId);
              return NextResponse.json({ error: `Failed to insert embeddings: ${embeddingsError.message}` }, { status: 500 });
            }

            totalEmbedded += insertedChunks.length;
          }
        }
      }

      // Mark import as complete
      await supabase
        .from('imports')
        .update({
          status: 'complete',
          processed_at: new Date().toISOString(),
          progress_json: {
            percent: 100,
            counts: { conversations: conversationIds.length, messages: totalMessagesInserted, chunks: totalChunksInserted, embedded: totalEmbedded },
          },
        })
        .eq('id', importId);

      // Increment limit counter
      await incrementLimit(user.id, 'import');

      return NextResponse.json({
        success: true,
        importId,
        conversationIds,
        status: 'complete',
        message: 'Import completed',
      });
    }

    // Generate dedupe hash
    // Match conversations by ID (handle both conversation_id and id fields)
    const firstConversation = conversationArray.find((conv: any) => {
      if (!conv || typeof conv !== 'object') return false;
      const convId = conv.conversation_id || conv.id;
      return convId && selectedConversationIds.includes(convId);
    });
    const dedupeHash = firstConversation
      ? generateDedupeHash(user.id, firstConversation.title || '', JSON.stringify(firstConversation).substring(0, 120))
      : crypto.createHash('sha256').update(`${user.id}:${importId}:${Date.now()}`).digest('hex');

    // Update import status to pending (will be processing when job starts)
    await supabase
      .from('imports')
      .update({
        status: 'pending',
        dedupe_hash: dedupeHash,
        progress_json: {
          percent: 0,
          counts: { conversations: 0, messages: 0, chunks: 0, embedded: 0 },
        },
      })
      .eq('id', importId)
      .eq('user_id', user.id);

    // Create job with full payload (use normalized array)
    const jobPayload = {
      import_id: importId,
      user_id: user.id,
      file_data: conversationArray, // Use normalized array instead of raw fileData
      selected_conversation_ids: selectedConversationIds,
      project_id: projectId || null,
      new_project: newProject || null,
    };

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        type: 'import_processing',
        payload: jobPayload,
        status: 'pending',
        step: 'queued',
        progress_json: {
          percent: 0,
          counts: { conversations: 0, messages: 0, chunks: 0, embedded: 0 },
        },
        run_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !job) {
      await supabase
        .from('imports')
        .update({
          status: 'error',
          error_message: jobError?.message || 'Failed to create job',
        })
        .eq('id', importId);
      return NextResponse.json({ error: 'Failed to queue import job' }, { status: 500 });
    }

    // Increment limit counter (only when job is successfully queued)
    await incrementLimit(user.id, 'import');

    // Trigger immediate job processing (fire-and-forget, non-blocking)
    // This starts processing right away instead of waiting for cron
    // Process first step only to get it started (cron will continue)
    // Don't await to avoid blocking the response
    (async () => {
      try {
        // Just process the first step to get it started
        // Cron will continue with subsequent steps
        const result = await processImportJobStep(job.id);
        console.log(`[Import] Processed initial step. Next step: ${result.nextStep || 'complete'}, Error: ${result.error || 'none'}`);
      } catch (err) {
        // Silently fail - cron will pick it up if this fails
        console.log('[Import] Immediate processing failed (cron will handle it):', err instanceof Error ? err.message : 'Unknown error');
      }
    })();

    // Note: Analytics events are fired client-side in import/page.tsx
    // to capture latency and handle failures

    // Return immediately - job processing has been triggered
    return NextResponse.json({
      success: true,
      jobId: job.id,
      importId,
      status: 'queued',
      message: 'Import queued for processing',
    });
  } catch (error) {
    console.error('Import queueing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to queue import' },
      { status: 500 }
    );
  }
}
