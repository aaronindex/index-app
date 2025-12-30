// app/api/imports/jobs/route.ts
// Polling endpoint for import job status

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Get last 5 import jobs for user
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, type, step, status, progress_json, last_error, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('type', 'import_processing')
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    // Format jobs for UI
    const formattedJobs = (jobs || []).map((job) => {
      const progress = (job.progress_json as any) || {
        percent: 0,
        counts: { conversations: 0, messages: 0, chunks: 0, embedded: 0 },
      };

      const stepLabels: Record<string, string> = {
        queued: 'Queued',
        parse: 'Parsing',
        insert_conversations: 'Creating conversations',
        insert_messages: 'Inserting messages',
        chunk_messages: 'Chunking messages',
        embed_chunks: 'Embedding',
        finalize: 'Finalizing',
      };

      const stepLabel = stepLabels[job.step] || job.step;
      const counts = progress.counts || {};
      const countStr = [
        counts.conversations ? `${counts.conversations} conversations` : null,
        counts.messages ? `${counts.messages} messages` : null,
        counts.chunks ? `${counts.chunks} chunks` : null,
        counts.embedded ? `${counts.embedded} embedded` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        id: job.id,
        step: job.step,
        stepLabel,
        status: job.status,
        percent: progress.percent || 0,
        counts: progress.counts || {},
        countStr,
        error: job.last_error,
        canRetry: job.status === 'error',
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      };
    });

    return NextResponse.json({ jobs: formattedJobs });
  } catch (error) {
    console.error('Error fetching import jobs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST endpoint to retry a failed job
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Verify job belongs to user and is in error state
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .eq('status', 'error')
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or cannot be retried' }, { status: 404 });
    }

    // Reset job to queued state
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'pending',
        step: 'queued',
        last_error: null,
        locked_at: null,
        attempt_count: 0,
      })
      .eq('id', jobId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error('Error retrying job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry job' },
      { status: 500 }
    );
  }
}

