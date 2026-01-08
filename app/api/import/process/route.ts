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
