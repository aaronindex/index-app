// app/api/import/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { parseChatGPTExport } from '@/lib/parsers/chatgpt';
import { chunkText } from '@/lib/chunking';
import { embedTexts } from '@/lib/ai/embeddings';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { importId, fileData, selectedConversationIds, projectId, newProject } = body;

    if (!importId || !fileData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Update import status to processing
    await supabase
      .from('imports')
      .update({ status: 'processing' })
      .eq('id', importId)
      .eq('user_id', user.id);

    // Parse the export
    const parsedConversations = parseChatGPTExport(fileData);

    // Filter to selected conversations only
    const conversationsToImport = parsedConversations.filter((conv) =>
      selectedConversationIds.includes(conv.id)
    );

    if (conversationsToImport.length === 0) {
      await supabase
        .from('imports')
        .update({ status: 'error', error_message: 'No conversations selected' })
        .eq('id', importId);
      return NextResponse.json({ error: 'No conversations to import' }, { status: 400 });
    }

    // Handle project creation if needed
    let finalProjectId: string | null = projectId || null;
    
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
        await supabase
          .from('imports')
          .update({
            status: 'error',
            error_message: `Failed to create project: ${projectError?.message || 'Unknown error'}`,
          })
          .eq('id', importId);
        return NextResponse.json(
          { error: 'Failed to create project', details: projectError?.message },
          { status: 400 }
        );
      }

      finalProjectId = newProjectData.id;
    }

    // Insert conversations and messages
    const insertedConversationIds: string[] = [];
    const errors: string[] = [];

    for (const parsedConv of conversationsToImport) {
      try {
        // Create conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            import_id: importId,
            title: parsedConv.title,
            source: 'chatgpt',
            started_at: parsedConv.startedAt.toISOString(),
            ended_at: parsedConv.endedAt?.toISOString() || null,
          })
          .select()
          .single();

        if (convError || !conversation) {
          errors.push(`Failed to create conversation "${parsedConv.title}": ${convError?.message || 'Unknown error'}`);
          console.error('Error creating conversation:', convError);
          continue;
        }

        insertedConversationIds.push(conversation.id);

        // Insert messages
        const messagesToInsert = parsedConv.messages.map((msg, index) => ({
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
          index_in_conversation: index,
          source_message_id: msg.source_message_id || null,
          raw_payload: msg.raw_payload || null, // Supabase JSONB handles objects directly
        }));

        // Debug: Log role counts (dev only)
        if (process.env.NODE_ENV === 'development') {
          const roleCounts = messagesToInsert.reduce((acc, msg) => {
            acc[msg.role] = (acc[msg.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log(`[Import] Conversation "${parsedConv.title}" role counts:`, roleCounts);
        }

        if (messagesToInsert.length > 0) {
          const { data: insertedMessages, error: messagesError } = await supabase
            .from('messages')
            .insert(messagesToInsert)
            .select('id, content');

          if (messagesError) {
            errors.push(`Failed to insert messages for "${parsedConv.title}": ${messagesError.message}`);
            console.error('Error inserting messages:', messagesError);
            continue;
          }

          // Chunk messages and generate embeddings
          if (insertedMessages && insertedMessages.length > 0) {
            try {
              const allChunks: Array<{
                message_id: string;
                content: string;
                chunk_index: number;
              }> = [];

              // Chunk each message
              for (const message of insertedMessages) {
                if (!message.content || message.content.trim().length === 0) {
                  continue;
                }

                const chunks = chunkText(message.content);
                for (const chunk of chunks) {
                  allChunks.push({
                    message_id: message.id,
                    content: chunk.content,
                    chunk_index: chunk.chunkIndex,
                  });
                }
              }

              if (allChunks.length > 0) {
                // Insert chunks
                const chunksToInsert = allChunks.map((chunk) => ({
                  user_id: user.id,
                  conversation_id: conversation.id,
                  message_id: chunk.message_id,
                  content: chunk.content,
                  chunk_index: chunk.chunk_index,
                }));

                const { data: insertedChunks, error: chunksError } = await supabase
                  .from('message_chunks')
                  .insert(chunksToInsert)
                  .select('id, content');

                if (chunksError) {
                  console.error('Error inserting chunks:', chunksError);
                  errors.push(`Failed to chunk messages for "${parsedConv.title}": ${chunksError.message}`);
                } else if (insertedChunks && insertedChunks.length > 0) {
                  // Generate embeddings in batches
                  const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs per request
                  const embeddingErrors: string[] = [];

                  for (let i = 0; i < insertedChunks.length; i += BATCH_SIZE) {
                    const batch = insertedChunks.slice(i, i + BATCH_SIZE);
                    const batchTexts = batch.map((chunk) => chunk.content);

                    try {
                      const embeddings = await embedTexts(batchTexts);

                      // Insert embeddings (pgvector format: array of numbers)
                      const embeddingsToInsert = batch.map((chunk, idx) => ({
                        chunk_id: chunk.id,
                        embedding: embeddings[idx], // Supabase handles array to vector conversion
                      }));

                      if (process.env.NODE_ENV === 'development') {
                        console.log(`[Import] Inserting ${embeddingsToInsert.length} embeddings for conversation "${parsedConv.title}"`);
                        console.log(`[Import] Sample embedding length: ${embeddings[0]?.length || 'N/A'}`);
                      }

                      const { data: insertedEmbeddings, error: embeddingsError } = await supabase
                        .from('message_chunk_embeddings')
                        .insert(embeddingsToInsert)
                        .select('chunk_id');

                      if (embeddingsError) {
                        console.error('Error inserting embeddings:', embeddingsError);
                        console.error('Embedding error details:', JSON.stringify(embeddingsError, null, 2));
                        embeddingErrors.push(
                          `Failed to store embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}: ${embeddingsError.message}`
                        );
                      } else if (process.env.NODE_ENV === 'development') {
                        console.log(`[Import] Successfully stored ${insertedEmbeddings?.length || 0} embeddings`);
                      }
                    } catch (embedError) {
                      const errorMsg = embedError instanceof Error ? embedError.message : 'Unknown error';
                      console.error('Error generating embeddings:', embedError);
                      embeddingErrors.push(`Failed to generate embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMsg}`);
                    }
                  }

                  if (embeddingErrors.length > 0) {
                    errors.push(`Embedding errors for "${parsedConv.title}": ${embeddingErrors.join('; ')}`);
                  }
                }
              }
            } catch (chunkError) {
              const errorMsg = chunkError instanceof Error ? chunkError.message : 'Unknown error';
              console.error('Error processing chunks/embeddings:', chunkError);
              errors.push(`Failed to process chunks for "${parsedConv.title}": ${errorMsg}`);
              // Don't fail the import if chunking/embedding fails
            }
          }
        }

        // Link to project if specified
        if (finalProjectId) {
          const { error: projectLinkError } = await supabase.from('project_conversations').insert({
            project_id: finalProjectId,
            conversation_id: conversation.id,
          });

          if (projectLinkError) {
            console.error('Error linking to project:', projectLinkError);
            // Don't fail the import if project linking fails
          }
        }

        // Auto-tag conversation (async, don't block import)
        try {
          const { extractTagsFromConversation } = await import('@/lib/ai/tagging');
          const taggingResult = await extractTagsFromConversation(conversation.title, messagesToInsert);

          // Store tags
          for (const tag of taggingResult.tags) {
            // Get or create tag
            let { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('user_id', user.id)
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
                  user_id: user.id,
                  name: tag.name,
                  category: tag.category,
                })
                .select()
                .single();

              if (!newTag) continue;
              tagId = newTag.id;
            }

            // Link tag to conversation
            await supabase.from('conversation_tags').upsert({
              conversation_id: conversation.id,
              tag_id: tagId,
              confidence: tag.confidence || 0.7,
            });
          }
        } catch (tagError) {
          // Don't fail import if tagging fails
          console.error('Error auto-tagging conversation:', tagError);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Error processing "${parsedConv.title}": ${errorMsg}`);
        console.error('Error processing conversation:', err);
      }
    }

    if (insertedConversationIds.length === 0) {
      await supabase
        .from('imports')
        .update({
          status: 'error',
          error_message: errors.join('; ') || 'No conversations were successfully imported',
        })
        .eq('id', importId);
      return NextResponse.json(
        { error: 'No conversations were successfully imported', details: errors },
        { status: 400 }
      );
    }

    // Update import status to complete (or partial if there were errors)
    const finalStatus = errors.length > 0 ? 'complete' : 'complete'; // Could add 'partial' status later
    await supabase
      .from('imports')
      .update({
        status: finalStatus,
        processed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? `Some errors occurred: ${errors.join('; ')}` : null,
      })
      .eq('id', importId);

    return NextResponse.json({
      success: true,
      conversationsImported: insertedConversationIds.length,
      conversationIds: insertedConversationIds,
      projectId: finalProjectId,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}

