// app/api/jobs/process/route.ts
// Worker endpoint to process one step of a job
// This can be called by a cron job, edge function, or manual trigger

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { processImportJobStep } from '@/lib/jobs/importProcessor';

// Force Node.js runtime to avoid Edge runtime issues with __dirname
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Verify job exists and is pending
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, type, step, status')
      .eq('id', jobId)
      .eq('status', 'pending')
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or not pending' }, { status: 404 });
    }

    if (job.type !== 'import_processing' && job.type !== 'quick_import') {
      return NextResponse.json({ error: 'Unsupported job type' }, { status: 400 });
    }

    // Process one step
    const result = await processImportJobStep(jobId);

    if (result.error) {
      return NextResponse.json({ error: result.error, step: job.step }, { status: 500 });
    }

    // If finalize step completed, mark job as complete
    if (job.step === 'finalize' && !result.nextStep) {
      await supabase
        .from('jobs')
        .update({
          status: 'complete',
          locked_at: null,
        })
        .eq('id', jobId);
    }

    return NextResponse.json({
      success: true,
      nextStep: result.nextStep,
      completed: !result.nextStep,
    });
  } catch (error) {
    console.error('Job processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Job processing failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to process next queued job (for cron/worker)
export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication
    // Vercel cron jobs automatically send x-vercel-cron header
    // We also support token query param for manual/external triggers
    const cronHeader = request.headers.get('x-vercel-cron');
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.CRON_TOKEN;

    // Allow if it's a Vercel cron job (has header) OR if token matches
    const isVercelCron = cronHeader === '1';
    const isTokenValid = expectedToken && token === expectedToken;

    if (!isVercelCron && !isTokenValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Find next pending job at any step (oldest first, not locked or locked > 5 minutes ago)
    // This processes jobs that are in progress, not just queued
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, type, step, status')
      .eq('status', 'pending')
      .or(`locked_at.is.null,locked_at.lt.${fiveMinutesAgo}`)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ message: 'No jobs to process' }, { status: 200 });
    }

    if (job.type !== 'import_processing' && job.type !== 'quick_import') {
      return NextResponse.json({ error: 'Unsupported job type' }, { status: 400 });
    }

    // Process one step
    const result = await processImportJobStep(job.id);

    if (result.error) {
      return NextResponse.json({ error: result.error, step: job.step }, { status: 500 });
    }

    // If finalize step completed, mark job as complete
    if (job.step === 'finalize' && !result.nextStep) {
      await supabase
        .from('jobs')
        .update({
          status: 'complete',
          locked_at: null,
        })
        .eq('id', job.id);
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      nextStep: result.nextStep,
      completed: !result.nextStep,
    });
  } catch (error) {
    console.error('Job processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Job processing failed' },
      { status: 500 }
    );
  }
}

