// lib/jobs/importProcessor.ts
// Step-by-step import job processor with idempotency and rate limiting

import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { parseChatGPTExport } from '@/lib/parsers/chatgpt';
import { chunkText } from '@/lib/chunking';
import { embedTexts } from '@/lib/ai/embeddings';
import crypto from 'crypto';

const EMBEDDING_BATCH_SIZE = 20; // OpenAI batch limit
const MAX_CHUNKS_PER_RUN = 300; // Cost safety limit
const MAX_RETRIES_PER_BATCH = 5;

interface JobPayload {
  import_id: string;
  user_id: string;
  file_data: any; // Parsed ChatGPT export
  selected_conversation_ids: string[];
  project_id: string | null;
  new_project: { name: string; description?: string } | null;
  parsed_conversations?: any[]; // Cached after parse step
  conversation_map?: Record<string, string>; // parsed_id -> db_id
  message_map?: Record<string, string>; // parsed_message_id -> db_id
}

interface Progress {
  percent: number;
  counts: {
    conversations: number;
    messages: number;
    chunks: number;
    embedded: number;
  };
}

export async function processImportJobStep(jobId: string): Promise<{ nextStep: string | null; error: string | null }> {
  const supabase = await getSupabaseServerClient();

  // Fetch job first
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !job) {
    return { nextStep: null, error: 'Job not found or already processed' };
  }

  // Lock and increment attempt count
  await supabase
    .from('jobs')
    .update({
      locked_at: new Date().toISOString(),
      attempt_count: (job.attempt_count || 0) + 1,
    })
    .eq('id', jobId);

  if (fetchError || !job) {
    return { nextStep: null, error: 'Job not found or already processed' };
  }

  let payload: JobPayload = { ...(job.payload as JobPayload) };
  let progress: Progress = { ...((job.progress_json as Progress) || {
    percent: 0,
    counts: { conversations: 0, messages: 0, chunks: 0, embedded: 0 },
  })};

  try {
    let nextStep: string | null = null;
    let error: string | null = null;

    // Handle quick_import jobs differently
    if (job.type === 'quick_import') {
      const quickResult = await processQuickImportJobStep(supabase, job, payload, progress);
      nextStep = quickResult.nextStep;
      error = quickResult.error;
      if (quickResult.payload) payload = quickResult.payload;
    } else {
      // Standard import_processing flow
      switch (job.step) {
        case 'queued':
        case 'parse':
          const result = await processParseStep(supabase, payload, progress);
          nextStep = result.nextStep;
          error = result.error;
          if (result.payload) payload = result.payload;
          break;

      case 'insert_conversations':
        const convResult = await processInsertConversationsStep(supabase, payload, progress);
        nextStep = convResult.nextStep;
        error = convResult.error;
        if (convResult.payload) payload = convResult.payload;
        break;

      case 'insert_messages':
        const msgResult = await processInsertMessagesStep(supabase, payload, progress);
        nextStep = msgResult.nextStep;
        error = msgResult.error;
        if (msgResult.payload) payload = msgResult.payload;
        break;

      case 'chunk_messages':
        const chunkResult = await processChunkMessagesStep(supabase, payload, progress);
        nextStep = chunkResult.nextStep;
        error = chunkResult.error;
        if (chunkResult.payload) payload = chunkResult.payload;
        break;

      case 'embed_chunks':
        const embedResult = await processEmbedChunksStep(supabase, payload, progress);
        nextStep = embedResult.nextStep;
        error = embedResult.error;
        if (embedResult.payload) payload = embedResult.payload;
        break;

        case 'finalize':
          const finalResult = await processFinalizeStep(supabase, payload, progress);
          nextStep = finalResult.nextStep;
          error = finalResult.error;
          break;

        default:
          error = `Unknown step: ${job.step}`;
      }
    }

    // Update job with next step or error (payload is updated in DB via step functions)
    if (error) {
      await supabase
        .from('jobs')
        .update({
          status: 'error',
          last_error: error,
          locked_at: null,
          payload: payload, // Save updated payload
        })
        .eq('id', jobId);

      // Update import status
      await supabase
        .from('imports')
        .update({
          status: 'error',
          error_message: error,
        })
        .eq('id', payload.import_id);
    } else if (nextStep) {
      await supabase
        .from('jobs')
        .update({
          step: nextStep,
          progress_json: progress,
          locked_at: null,
          payload: payload, // Save updated payload
        })
        .eq('id', jobId);

      // Update import progress
      await supabase
        .from('imports')
        .update({
          progress_json: progress,
        })
        .eq('id', payload.import_id);
    } else {
      // Finalize step completed - mark job and import as complete
      await supabase
        .from('jobs')
        .update({
          status: 'complete',
          progress_json: progress,
          locked_at: null,
          payload: payload, // Save updated payload
        })
        .eq('id', jobId);

      await supabase
        .from('imports')
        .update({
          status: 'complete',
          processed_at: new Date().toISOString(),
          progress_json: progress,
        })
        .eq('id', payload.import_id);
    }

    return { nextStep, error };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('jobs')
      .update({
        status: 'error',
        last_error: errorMsg,
        locked_at: null,
      })
      .eq('id', jobId);

    return { nextStep: null, error: errorMsg };
  }
}

async function processParseStep(
  supabase: any,
  payload: JobPayload,
  progress: Progress
): Promise<{ nextStep: string | null; error: string | null; payload?: JobPayload }> {
  try {
    const parsedConversations = parseChatGPTExport(payload.file_data);
    const conversationsToImport = parsedConversations.filter((conv) =>
      payload.selected_conversation_ids.includes(conv.id)
    );

    if (conversationsToImport.length === 0) {
      return { nextStep: null, error: 'No conversations selected' };
    }

    // Store parsed conversations in payload for next steps
    payload.parsed_conversations = conversationsToImport;
    payload.conversation_map = {};
    payload.message_map = {};

    progress.percent = 10;
    progress.counts.conversations = conversationsToImport.length;

    return { nextStep: 'insert_conversations', error: null, payload };
  } catch (err) {
    return { nextStep: null, error: err instanceof Error ? err.message : 'Parse failed' };
  }
}

async function processInsertConversationsStep(
  supabase: any,
  payload: JobPayload,
  progress: Progress
): Promise<{ nextStep: string | null; error: string | null; payload?: JobPayload }> {
  try {
    if (!payload.parsed_conversations) {
      return { nextStep: null, error: 'Parsed conversations not found' };
    }

    // Handle project creation if needed
    let finalProjectId = payload.project_id;
    if (payload.new_project && payload.new_project.name) {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: payload.user_id,
          name: payload.new_project.name,
          description: payload.new_project.description || null,
        })
        .select()
        .single();

      if (projectError || !newProject) {
        return { nextStep: null, error: `Failed to create project: ${projectError?.message || 'Unknown error'}` };
      }

      finalProjectId = newProject.id;
      payload.project_id = finalProjectId;
    }

    // Insert conversations with UPSERT (idempotent)
    for (const parsedConv of payload.parsed_conversations) {
      // Use stable ID from export if available, otherwise use import_id + title hash
      const stableId = parsedConv.id || null;
      const dedupeKey = stableId || `${payload.import_id}-${parsedConv.title}`;

      // Check if conversation already exists (idempotent)
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('import_id', payload.import_id)
        .eq('title', parsedConv.title)
        .eq('user_id', payload.user_id)
        .single();

      let conversation;
      if (existing) {
        conversation = existing;
      } else {
        // Handle startedAt/endedAt - they might be Date objects or ISO strings (from JSON serialization)
        const startedAt = parsedConv.startedAt instanceof Date 
          ? parsedConv.startedAt 
          : parsedConv.startedAt 
            ? new Date(parsedConv.startedAt) 
            : new Date();
        const endedAt = parsedConv.endedAt instanceof Date 
          ? parsedConv.endedAt 
          : parsedConv.endedAt 
            ? new Date(parsedConv.endedAt) 
            : null;

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: payload.user_id,
            import_id: payload.import_id,
            title: parsedConv.title,
            source: 'chatgpt',
            started_at: startedAt.toISOString(),
            ended_at: endedAt?.toISOString() || null,
          })
          .select()
          .single();

        if (convError || !newConv) {
          // Try fetching again in case of race condition
          const { data: retry } = await supabase
            .from('conversations')
            .select('id')
            .eq('import_id', payload.import_id)
            .eq('title', parsedConv.title)
            .eq('user_id', payload.user_id)
            .single();

          if (retry) {
            conversation = retry;
          } else {
            return { nextStep: null, error: `Failed to create conversation "${parsedConv.title}": ${convError?.message || 'Unknown error'}` };
          }
        } else {
          conversation = newConv;
        }
      }

      if (conversation) {
        payload.conversation_map![parsedConv.id] = conversation.id;
      }

      // Link to project if specified (idempotent)
      if (finalProjectId && conversation) {
        const { data: existingLink } = await supabase
          .from('project_conversations')
          .select('project_id')
          .eq('project_id', finalProjectId)
          .eq('conversation_id', conversation.id)
          .single();

        if (!existingLink) {
          await supabase
            .from('project_conversations')
            .insert({
              project_id: finalProjectId,
              conversation_id: conversation.id,
            });
        }
      }
    }

    progress.percent = 30;
    return { nextStep: 'insert_messages', error: null, payload };
  } catch (err) {
    return { nextStep: null, error: err instanceof Error ? err.message : 'Insert conversations failed' };
  }
}

async function processInsertMessagesStep(
  supabase: any,
  payload: JobPayload,
  progress: Progress
): Promise<{ nextStep: string | null; error: string | null; payload?: JobPayload }> {
  try {
    if (!payload.parsed_conversations || !payload.conversation_map) {
      return { nextStep: null, error: 'Conversations not found' };
    }

    let totalMessages = 0;

    for (const parsedConv of payload.parsed_conversations) {
      const conversationId = payload.conversation_map[parsedConv.id];
      if (!conversationId) continue;

      const messagesToInsert = parsedConv.messages.map((msg: any, index: number) => ({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        index_in_conversation: index,
        source_message_id: msg.source_message_id || null,
        raw_payload: msg.raw_payload || null,
      }));

      if (messagesToInsert.length > 0) {
        // Insert messages (idempotent - check existing first)
        // Delete existing messages for this conversation to avoid duplicates on retry
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', conversationId);

        const { error: messagesError } = await supabase
          .from('messages')
          .insert(messagesToInsert);

        if (messagesError) {
          console.error(`Error inserting messages for conversation ${conversationId}:`, messagesError);
          // Continue with other conversations
        } else {
          totalMessages += messagesToInsert.length;
        }
      }
    }

    progress.percent = 50;
    progress.counts.messages = totalMessages;

    return { nextStep: 'chunk_messages', error: null, payload };
  } catch (err) {
    return { nextStep: null, error: err instanceof Error ? err.message : 'Insert messages failed' };
  }
}

async function processChunkMessagesStep(
  supabase: any,
  payload: JobPayload,
  progress: Progress
): Promise<{ nextStep: string | null; error: string | null; payload?: JobPayload }> {
  try {
    if (!payload.conversation_map) {
      return { nextStep: null, error: 'Conversation map not found' };
    }

    const conversationIds = Object.values(payload.conversation_map);

    // Fetch all messages for these conversations
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, conversation_id')
      .in('conversation_id', conversationIds)
      .order('conversation_id')
      .order('index_in_conversation');

    if (messagesError) {
      return { nextStep: null, error: `Failed to fetch messages: ${messagesError.message}` };
    }

    if (!messages || messages.length === 0) {
      return { nextStep: 'finalize', error: null }; // Skip to finalize if no messages
    }

    // Chunk messages and insert
    const allChunks: Array<{
      message_id: string;
      conversation_id: string;
      content: string;
      chunk_index: number;
    }> = [];

    for (const message of messages) {
      if (!message.content || message.content.trim().length === 0) continue;

      const chunks = chunkText(message.content);
      for (const chunk of chunks) {
        allChunks.push({
          message_id: message.id,
          conversation_id: message.conversation_id,
          content: chunk.content,
          chunk_index: chunk.chunkIndex,
        });
      }
    }

    if (allChunks.length > 0) {
      // Insert chunks with UPSERT (idempotent)
      const chunksToInsert = allChunks.map((chunk) => ({
        user_id: payload.user_id,
        conversation_id: chunk.conversation_id,
        message_id: chunk.message_id,
        content: chunk.content,
        chunk_index: chunk.chunk_index,
      }));

      // Delete existing chunks for these messages (idempotent)
      const messageIds = [...new Set(chunksToInsert.map((c) => c.message_id))];
      await supabase
        .from('message_chunks')
        .delete()
        .in('message_id', messageIds);

      // Insert chunks and get IDs back in one query (much faster than fetching one-by-one)
      const { data: insertedChunks, error: chunksError } = await supabase
        .from('message_chunks')
        .insert(chunksToInsert)
        .select('id');

      if (chunksError) {
        return { nextStep: null, error: `Failed to insert chunks: ${chunksError.message}` };
      }

      progress.counts.chunks = allChunks.length;
      progress.percent = 70;

      // Store chunk IDs for embedding step (from insert response - much faster!)
      if (insertedChunks && insertedChunks.length > 0) {
        const chunkIds = insertedChunks.map((c: any) => c.id);
        (payload as any).chunk_ids = chunkIds;
      }
    } else {
      progress.percent = 70;
    }

    return { nextStep: 'embed_chunks', error: null, payload };
  } catch (err) {
    return { nextStep: null, error: err instanceof Error ? err.message : 'Chunk messages failed' };
  }
}

async function processEmbedChunksStep(
  supabase: any,
  payload: JobPayload,
  progress: Progress
): Promise<{ nextStep: string | null; error: string | null; payload?: JobPayload }> {
  try {
    const chunkIds = (payload as any).chunk_ids as string[] | undefined;
    if (!chunkIds || chunkIds.length === 0) {
      return { nextStep: 'finalize', error: null }; // Skip to finalize if no chunks
    }

    // Fetch chunks that need embeddings
    const { data: chunks, error: chunksError } = await supabase
      .from('message_chunks')
      .select('id, content')
      .in('id', chunkIds);

    if (chunksError) {
      return { nextStep: null, error: `Failed to fetch chunks: ${chunksError.message}` };
    }

    if (!chunks || chunks.length === 0) {
      return { nextStep: 'finalize', error: null };
    }

    // Check which chunks already have embeddings
    const { data: existingEmbeddings } = await supabase
      .from('message_chunk_embeddings')
      .select('chunk_id')
      .in('chunk_id', chunkIds);

    const existingChunkIds = new Set(existingEmbeddings?.map((e: any) => e.chunk_id) || []);
    const chunksToEmbed = chunks.filter((c: any) => !existingChunkIds.has(c.id));

    if (chunksToEmbed.length === 0) {
      progress.percent = 90;
      progress.counts.embedded = chunks.length;
      return { nextStep: 'finalize', error: null };
    }

    // Process in batches with cost safety (max 300 chunks per run)
    const chunksToProcess = chunksToEmbed.slice(0, MAX_CHUNKS_PER_RUN);
    const remainingChunks = chunksToEmbed.slice(MAX_CHUNKS_PER_RUN);

    // Embed in batches of 20
    let embeddedCount = progress.counts.embedded || 0;

    for (let i = 0; i < chunksToProcess.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunksToProcess.slice(i, i + EMBEDDING_BATCH_SIZE);
      const batchTexts = batch.map((c: any) => c.content);

      let retries = 0;
      let success = false;

      while (retries < MAX_RETRIES_PER_BATCH && !success) {
        try {
          const embeddings = await embedTexts(batchTexts);

          // Delete existing embeddings for these chunks (idempotency)
          await supabase
            .from('message_chunk_embeddings')
            .delete()
            .in('chunk_id', batch.map((c: any) => c.id));

          // Insert new embeddings
          const embeddingsToInsert = batch.map((chunk: any, idx: number) => ({
            chunk_id: chunk.id,
            embedding: embeddings[idx],
          }));

          const { error: embeddingsError } = await supabase
            .from('message_chunk_embeddings')
            .insert(embeddingsToInsert);

          if (embeddingsError) {
            throw new Error(`Failed to store embeddings: ${embeddingsError.message}`);
          }

          embeddedCount += batch.length;
          success = true;
        } catch (err: any) {
          retries++;
          const isRateLimit = err.message?.includes('429') || err.message?.includes('rate limit');
          
          if (isRateLimit && retries < MAX_RETRIES_PER_BATCH) {
            // Exponential backoff: 1s, 2s, 4s, 8s
            const delayMs = Math.pow(2, retries - 1) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          } else {
            throw err;
          }
        }
      }

      if (!success) {
        return { nextStep: null, error: `Failed to embed batch after ${MAX_RETRIES_PER_BATCH} retries` };
      }
    }

    progress.counts.embedded = embeddedCount;
    progress.percent = remainingChunks.length > 0 ? 85 : 90;

    // If there are remaining chunks, keep step as 'embed_chunks' for next run
    if (remainingChunks.length > 0) {
      return { nextStep: 'embed_chunks', error: null, payload }; // Will be processed in next run
    }

    return { nextStep: 'finalize', error: null, payload };
  } catch (err) {
    return { nextStep: null, error: err instanceof Error ? err.message : 'Embed chunks failed' };
  }
}

async function processFinalizeStep(
  supabase: any,
  payload: JobPayload,
  progress: Progress
): Promise<{ nextStep: string | null; error: string | null }> {
  try {
    // Auto-tag conversations (async, don't block)
    try {
      const { extractTagsFromConversation } = await import('@/lib/ai/tagging');
      const conversationIds = Object.values(payload.conversation_map || {});

      for (const convId of conversationIds) {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id, title')
          .eq('id', convId)
          .single();

        if (!conversation) continue;

        const { data: messages } = await supabase
          .from('messages')
          .select('content, role')
          .eq('conversation_id', convId)
          .order('index_in_conversation');

        if (messages && messages.length > 0) {
          const taggingResult = await extractTagsFromConversation(
            conversation.title || '',
            messages.map((m: any) => ({ role: m.role, content: m.content }))
          );

          // Store tags (idempotent)
          for (const tag of taggingResult.tags) {
            let { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('user_id', payload.user_id)
              .eq('name', tag.name)
              .eq('category', tag.category)
              .single();

            let tagId: string;
            if (existingTag) {
              tagId = existingTag.id;
            } else {
              const { data: newTag } = await supabase
                .from('tags')
                .insert({
                  user_id: payload.user_id,
                  name: tag.name,
                  category: tag.category,
                })
                .select()
                .single();

              if (!newTag) continue;
              tagId = newTag.id;
            }

            await supabase.from('conversation_tags').upsert({
              conversation_id: convId,
              tag_id: tagId,
              confidence: tag.confidence || 0.7,
            });
          }
        }
      }
    } catch (tagError) {
      // Don't fail import if tagging fails
      console.error('Error auto-tagging:', tagError);
    }

    // Update import status
    await supabase
      .from('imports')
      .update({
        status: 'complete',
        processed_at: new Date().toISOString(),
        progress_json: progress,
      })
      .eq('id', payload.import_id);

    // Dispatch structure recomputation (debounced)
    // Ingestion creates new conversations which may generate decision signals
    try {
      const { dispatchStructureRecompute } = await import('@/lib/structure/dispatch');
      await dispatchStructureRecompute({
        supabaseClient: supabase,
        user_id: payload.user_id,
        scope: 'user',
        reason: 'ingestion',
      });
    } catch (dispatchError) {
      // Log but don't fail the import if dispatch fails
      console.error('[ImportProcessor] Failed to dispatch structure recompute:', dispatchError);
    }

    // Note: Job completion is handled by the caller with jobId

    progress.percent = 100;

    return { nextStep: null, error: null };
  } catch (err) {
    return { nextStep: null, error: err instanceof Error ? err.message : 'Finalize failed' };
  }
}

// Helper to generate dedupe hash
export function generateDedupeHash(userId: string, title: string, content: string): string {
  const hashInput = `${userId}:${title}:${content.substring(0, 120)}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

// Process quick_import jobs (simpler flow: already parsed, just insert and process)
async function processQuickImportJobStep(
  supabase: any,
  job: any,
  payload: any,
  progress: Progress
): Promise<{ nextStep: string | null; error: string | null; payload?: any }> {
  try {
    const {
      import_id,
      user_id,
      transcript,
      title,
      parsed_messages,
      project_id,
      new_project,
    } = payload;

    switch (job.step) {
      case 'queued':
      case 'insert_conversations': {
        // Handle project creation if needed
        let finalProjectId = project_id;
        if (new_project && new_project.name) {
          const { data: newProjectData, error: projectError } = await supabase
            .from('projects')
            .insert({
              user_id,
              name: new_project.name,
              description: new_project.description || null,
            })
            .select()
            .single();

          if (projectError || !newProjectData) {
            return { nextStep: null, error: `Failed to create project: ${projectError?.message || 'Unknown error'}` };
          }

          finalProjectId = newProjectData.id;
          payload.project_id = finalProjectId;
        }

        // Create conversation (mark as inactive until import completes)
        const now = new Date();
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id,
            import_id,
            title,
            source: 'quick_import',
            started_at: now.toISOString(),
            ended_at: now.toISOString(),
            is_inactive: true, // Hide until import completes
          })
          .select()
          .single();

        if (convError || !conversation) {
          return { nextStep: null, error: `Failed to create conversation: ${convError?.message || 'Unknown error'}` };
        }

        payload.conversation_id = conversation.id;

        // Link to project if specified
        if (finalProjectId) {
          await supabase
            .from('project_conversations')
            .insert({
              project_id: finalProjectId,
              conversation_id: conversation.id,
            });
        }

        progress.percent = 20;
        progress.counts.conversations = 1;
        return { nextStep: 'insert_messages', error: null, payload };
      }

      case 'insert_messages': {
        if (!payload.conversation_id) {
          return { nextStep: null, error: 'Conversation ID not found' };
        }

        const messagesToInsert = parsed_messages.map((msg: any, index: number) => ({
          conversation_id: payload.conversation_id,
          role: msg.role,
          content: msg.content,
          index_in_conversation: index,
          source_message_id: null,
          raw_payload: null,
        }));

        const { error: messagesError } = await supabase.from('messages').insert(messagesToInsert);

        if (messagesError) {
          return { nextStep: null, error: `Failed to insert messages: ${messagesError.message}` };
        }

        progress.percent = 40;
        progress.counts.messages = messagesToInsert.length;
        return { nextStep: 'chunk_messages', error: null, payload };
      }

      case 'chunk_messages': {
        if (!payload.conversation_id) {
          return { nextStep: null, error: 'Conversation ID not found' };
        }

        // Fetch messages to chunk
        const { data: messages, error: fetchMessagesError } = await supabase
          .from('messages')
          .select('id, content')
          .eq('conversation_id', payload.conversation_id)
          .order('index_in_conversation');

        if (fetchMessagesError || !messages || messages.length === 0) {
          return { nextStep: 'finalize', error: null };
        }

        // Chunk each message
        const allChunks: Array<{
          message_id: string;
          conversation_id: string;
          content: string;
          chunk_index: number;
        }> = [];

        for (const message of messages) {
          const chunks = chunkText(message.content);
          for (const chunk of chunks) {
            allChunks.push({
              message_id: message.id,
              conversation_id: payload.conversation_id,
              content: chunk.content,
              chunk_index: chunk.chunkIndex,
            });
          }
        }

        if (allChunks.length === 0) {
          return { nextStep: 'finalize', error: null };
        }

        // Insert chunks
        const chunksToInsert = allChunks.map((chunk) => ({
          user_id,
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
          return { nextStep: null, error: `Failed to insert chunks: ${chunksError?.message || 'Unknown error'}` };
        }

        payload.chunk_ids = insertedChunks.map((c: { id: string }) => c.id);
        progress.percent = 60;
        progress.counts.chunks = insertedChunks.length;
        return { nextStep: 'embed_chunks', error: null, payload };
      }

      case 'embed_chunks': {
        if (!payload.chunk_ids || payload.chunk_ids.length === 0) {
          return { nextStep: 'finalize', error: null };
        }

        // Fetch chunks to embed
        const { data: chunks, error: fetchChunksError } = await supabase
          .from('message_chunks')
          .select('id, content')
          .in('id', payload.chunk_ids);

        if (fetchChunksError || !chunks || chunks.length === 0) {
          return { nextStep: 'finalize', error: null };
        }

        // Embed in batches
        const chunkContents = chunks.map((c: { content: string }) => c.content);
        const batchSize = EMBEDDING_BATCH_SIZE;
        let embedded = 0;

        for (let i = 0; i < chunkContents.length; i += batchSize) {
          const batch = chunkContents.slice(i, i + batchSize);
          const batchChunks = chunks.slice(i, i + batchSize);

          let retries = 0;
          let embeddings: number[][] = [];

          while (retries < MAX_RETRIES_PER_BATCH) {
            try {
              embeddings = await embedTexts(batch);
              break;
            } catch (err: any) {
              if (err.message?.includes('429') || err.message?.includes('rate limit')) {
                retries++;
                const delay = Math.min(1000 * Math.pow(2, retries), 8000);
                await new Promise((resolve) => setTimeout(resolve, delay));
              } else {
                throw err;
              }
            }
          }

          if (embeddings.length !== batch.length) {
            return { nextStep: null, error: 'Failed to generate embeddings for all chunks' };
          }

          // Insert embeddings
          const embeddingsToInsert = batchChunks.map((chunk: { id: string }, idx: number) => ({
            chunk_id: chunk.id,
            embedding: embeddings[idx],
          }));

          const { error: embeddingsError } = await supabase
            .from('message_chunk_embeddings')
            .insert(embeddingsToInsert);

          if (embeddingsError) {
            return { nextStep: null, error: `Failed to insert embeddings: ${embeddingsError.message}` };
          }

          embedded += batch.length;
          progress.counts.embedded = embedded;
          progress.percent = 60 + Math.floor((embedded / chunkContents.length) * 30);
        }

        return { nextStep: 'finalize', error: null, payload };
      }

      case 'finalize': {
        // Mark import as complete
        await supabase
          .from('imports')
          .update({
            status: 'complete',
            processed_at: new Date().toISOString(),
            progress_json: progress,
          })
          .eq('id', import_id);

        // Activate conversation (make it visible)
        if (payload.conversation_id) {
          await supabase
            .from('conversations')
            .update({
              is_inactive: false,
            })
            .eq('id', payload.conversation_id);
        }

        progress.percent = 100;
        return { nextStep: null, error: null };
      }

      default:
        return { nextStep: null, error: `Unknown step: ${job.step}` };
    }
  } catch (err) {
    return { nextStep: null, error: err instanceof Error ? err.message : 'Quick import processing failed' };
  }
}

