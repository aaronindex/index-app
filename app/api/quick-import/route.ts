// app/api/quick-import/route.ts
// Quick Import: paste one conversation transcript

import { NextRequest, NextResponse } from 'next/server';

// Allow up to 5 minutes so long conversations can finish (embeddings + title + DB)
export const maxDuration = 300;
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { parseTranscript } from '@/lib/parsers/transcript';
import { chunkText } from '@/lib/chunking';
import { embedTextsInBatches } from '@/lib/ai/embeddings';
import { generateDedupeHash } from '@/lib/jobs/importProcessor';
import { dispatchStructureRecompute } from '@/lib/structure/dispatch';
import crypto from 'crypto';

const GENERIC_SOURCE_TITLES = new Set(['user', 'assistant', 'ai', 'untitled', 'untitled conversation', 'quick capture']);

function deriveSourceTitleFromTranscript(transcript: string): string | null {
  if (!transcript || typeof transcript !== 'string') return null;

  const trimmed = transcript.trim();
  if (!trimmed) return null;

  // Take the first non-empty line
  const firstLine = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return null;

  let candidate = firstLine;

  // Strip common role prefixes so we don't use "User" or "Assistant" as the title
  candidate = candidate.replace(/^(user|assistant|ai|human):\s*/i, '').trim();
  if (!candidate) return null;

  // Optionally cut at the first sentence boundary within the line
  const sentenceBoundaryMatch = candidate.match(/(.+?[.!?])\s/);
  if (sentenceBoundaryMatch && sentenceBoundaryMatch[1]) {
    candidate = sentenceBoundaryMatch[1];
  }

  // Truncate to roughly 8–12 words (hard cap at 12)
  const words = candidate.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return null;

  const truncatedWords = words.slice(0, 12);
  candidate = truncatedWords.join(' ');

  // Normalize whitespace and strip excessive trailing punctuation
  candidate = candidate.replace(/\s+/g, ' ').replace(/[-–—,:;…]+$/g, '').trim();

  if (!candidate) return null;
  if (GENERIC_SOURCE_TITLES.has(candidate.toLowerCase())) return null;
  return candidate;
}

function fallbackQuickCaptureTitle(): string {
  const now = new Date();
  const formatted = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Quick Capture — ${formatted}`;
}

/** Derive a short title from the first user message content (content-derived, not transcript first line). */
function deriveTitleFromFirstUserMessage(parsed: { messages: Array<{ role: string; content: string }> }): string | null {
  const firstUser = parsed.messages.find((m) => m.role === 'user');
  if (!firstUser?.content?.trim()) return null;
  const text = firstUser.content.replace(/\s+/g, ' ').trim();
  const firstSentence = text.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? text.slice(0, 60).trim();
  const candidate = firstSentence.slice(0, 52).replace(/\s+\S*$/, '').trim();
  if (candidate.length < 4) return null;
  if (GENERIC_SOURCE_TITLES.has(candidate.toLowerCase())) return null;
  return candidate;
}

async function processQuickImportSync(
  supabase: any,
  userId: string,
  transcript: string,
  title: string,
  parsed: ReturnType<typeof parseTranscript>,
  projectId: string | null,
  newProject: { name: string; description?: string } | null
): Promise<{ conversationId: string; error: string | null }> {
  try {
    // Handle project creation if needed
    let finalProjectId = projectId;
    if (newProject && newProject.name) {
      const { data: newProjectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: newProject.name,
          description: newProject.description || null,
        })
        .select()
        .single();

      if (projectError || !newProjectData) {
        return { conversationId: '', error: `Failed to create project: ${projectError?.message || 'Unknown error'}` };
      }

      finalProjectId = newProjectData.id;
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('imports')
      .insert({
        user_id: userId,
        source: 'quick_import',
        status: 'processing',
        raw_file_path: null,
      })
      .select()
      .single();

    if (importError || !importRecord) {
      return { conversationId: '', error: `Failed to create import record: ${importError?.message || 'Unknown error'}` };
    }

    // Create conversation (mark as inactive until import completes).
    // Micro-capture: default thinking window to now (UTC) so structure jobs don't fail with missing thinking time.
    const now = new Date();
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        import_id: importRecord.id,
        title: title, // Use the title parameter (already processed in POST handler)
        source: 'quick_import',
        started_at: now.toISOString(),
        ended_at: now.toISOString(),
        is_inactive: true, // Hide until import completes
      })
      .select()
      .single();

    if (convError || !conversation) {
      return { conversationId: '', error: `Failed to create conversation: ${convError?.message || 'Unknown error'}` };
    }

    // Insert messages
    const messagesToInsert = parsed.messages.map((msg, index) => ({
      conversation_id: conversation.id,
      role: msg.role,
      content: msg.content,
      index_in_conversation: index,
      source_message_id: null,
      raw_payload: null,
    }));

    const { error: messagesError } = await supabase.from('messages').insert(messagesToInsert);

    if (messagesError) {
      return { conversationId: conversation.id, error: `Failed to insert messages: ${messagesError.message}` };
    }

    // Link to project if specified
    if (finalProjectId) {
      await supabase
        .from('project_conversations')
        .insert({
          project_id: finalProjectId,
          conversation_id: conversation.id,
        });
    }

    // Chunk and embed messages
    const allChunks: Array<{
      message_id: string;
      conversation_id: string;
      content: string;
      chunk_index: number;
    }> = [];

    // Fetch messages to chunk
    const { data: messages, error: fetchMessagesError } = await supabase
      .from('messages')
      .select('id, content')
      .eq('conversation_id', conversation.id)
      .order('index_in_conversation');

    if (fetchMessagesError || !messages || messages.length === 0) {
      // No messages to chunk, mark as complete
      await supabase
        .from('imports')
        .update({
          status: 'complete',
          processed_at: new Date().toISOString(),
        })
        .eq('id', importRecord.id);
      return { conversationId: conversation.id, error: null };
    }

    // Chunk each message
    for (const message of messages) {
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

    if (allChunks.length === 0) {
      // No chunks to embed, mark as complete
      await supabase
        .from('imports')
        .update({
          status: 'complete',
          processed_at: new Date().toISOString(),
        })
        .eq('id', importRecord.id);
      return { conversationId: conversation.id, error: null };
    }

    // Insert chunks
    const chunksToInsert = allChunks.map((chunk) => ({
      user_id: userId,
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
      return { conversationId: conversation.id, error: `Failed to insert chunks: ${chunksError?.message || 'Unknown error'}` };
    }

    // Embed chunks in batches to avoid timeouts on long conversations
    const chunkContents = insertedChunks.map((c: { content: string }) => c.content);
    const embeddings = await embedTextsInBatches(chunkContents);

    // Insert embeddings
    const embeddingsToInsert = insertedChunks.map((chunk: { id: string }, idx: number) => ({
      chunk_id: chunk.id,
      embedding: embeddings[idx],
    }));

    const { error: embeddingsError } = await supabase
      .from('message_chunk_embeddings')
      .insert(embeddingsToInsert);

    if (embeddingsError) {
      return { conversationId: conversation.id, error: `Failed to insert embeddings: ${embeddingsError.message}` };
    }

    // Mark import as complete
    await supabase
      .from('imports')
      .update({
        status: 'complete',
        processed_at: new Date().toISOString(),
      })
      .eq('id', importRecord.id);

    // Activate conversation (make it visible)
    await supabase
      .from('conversations')
      .update({
        is_inactive: false,
      })
      .eq('id', conversation.id);

    // Dispatch structure recomputation (debounced, fire-and-forget).
    // Do not block the quick import UX on downstream structure jobs.
    try {
      void dispatchStructureRecompute({
        supabaseClient: supabase,
        user_id: userId,
        scope: 'user',
        reason: 'ingestion',
      });
    } catch (dispatchError) {
      // Log but don't fail the import if dispatch scheduling fails
      console.error('[QuickImport] Failed to dispatch structure recompute:', dispatchError);
    }

    return { conversationId: conversation.id, error: null };
  } catch (error) {
    return {
      conversationId: '',
      error: error instanceof Error ? error.message : 'Failed to process quick import',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check import limit
    const { checkImportLimit, incrementLimit } = await import('@/lib/limits');
    const limitCheck = await checkImportLimit(user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || 'Import limit reached' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { transcript, title, projectId, newProject } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    // Check conversation size
    const { checkConversationSize } = await import('@/lib/limits');
    const sizeCheck = checkConversationSize(transcript);
    if (!sizeCheck.allowed) {
      return NextResponse.json(
        { error: sizeCheck.message || 'Conversation too large' },
        { status: 400 }
      );
    }

    // Parse transcript (no swapRoles or treatAsSingleBlock options)
    const parsed = parseTranscript(transcript);

    if (parsed.messages.length === 0) {
      return NextResponse.json({ error: 'No messages found in transcript' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Generate title if not provided or empty: prefer content-derived (first user message) over transcript first line
    let finalTitle = title?.trim() || '';
    if (!finalTitle) {
      const fromTranscript = deriveSourceTitleFromTranscript(transcript);
      const fromFirstUser = deriveTitleFromFirstUserMessage(parsed);
      finalTitle = fromTranscript || fromFirstUser || fallbackQuickCaptureTitle();
    }

    // Check for duplicates
    const normalizedText = transcript.trim().substring(0, 4000);
    const dedupeHash = generateDedupeHash(user.id, finalTitle, normalizedText);

    const { data: existingImport } = await supabase
      .from('imports')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('dedupe_hash', dedupeHash)
      .single();

    if (existingImport) {
      // Find the conversation linked to this import
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('import_id', existingImport.id)
        .eq('user_id', user.id)
        .single();

      // If import exists but conversation doesn't (failed job), allow re-import
      // Only block if import is complete and conversation exists
      if (existingImport.status === 'complete' && existingConv) {
        return NextResponse.json(
          {
            error: 'duplicate',
            existingConversationId: existingConv.id,
            existingTitle: existingConv.title || finalTitle,
          },
          { status: 409 }
        );
      }
      
      // If import is pending/processing but no conversation yet, allow re-import
      // (the old import might be stuck)
      // Continue with new import
    }

    // Always process quick imports synchronously (no queuing)
    // Quick imports are meant to be fast, single conversations
    const result = await processQuickImportSync(
      supabase,
      user.id,
      transcript,
      finalTitle,
      parsed,
      projectId || null,
      newProject || null
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Increment limit counter
    await incrementLimit(user.id, 'import');

    // Note: Analytics events are fired client-side to capture latency
    // and handle failures properly

    return NextResponse.json({
      success: true,
      conversationId: result.conversationId,
      title: finalTitle,
      messageCount: parsed.messages.length,
      processed: true,
    });
  } catch (error) {
    console.error('Quick import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process quick import' },
      { status: 500 }
    );
  }
}

