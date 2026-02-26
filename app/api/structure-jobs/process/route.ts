// app/api/structure-jobs/process/route.ts
// Manual processor endpoint for structure_jobs
// Processes queued structure jobs by calling runStructureJob()

import { NextRequest, NextResponse } from 'next/server';
import { runStructureJob } from '@/lib/structure/jobs/job.processor';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/structure-jobs/process
 * 
 * Processes queued structure_jobs.
 * 
 * Authentication:
 * - Requires header `x-index-admin-secret` matching `INDEX_ADMIN_SECRET` env var
 * 
 * Behavior:
 * - Finds up to `limit` queued jobs (default 5), oldest first
 * - For each job: calls runStructureJob() with service-role client
 * - Returns summary of processed jobs
 * 
 * Query params:
 * - limit: number of jobs to process (default 5, max 20)
 */
export async function POST(request: NextRequest) {
  try {
    // Guard: require admin secret
    const adminSecret = request.headers.get('x-index-admin-secret');
    const expectedSecret = process.env.INDEX_ADMIN_SECRET;

    if (!expectedSecret) {
      console.error('[StructureJobsProcess] INDEX_ADMIN_SECRET not configured');
      return NextResponse.json(
        { error: 'Processor not configured' },
        { status: 500 }
      );
    }

    if (!adminSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse limit from query params
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '5', 10)),
      20 // Max 20 jobs per request
    );

    // Get service-role Supabase client (bypasses RLS)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase service role credentials not configured' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find queued jobs (oldest first)
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('structure_jobs')
      .select('id, user_id, scope, type, status, payload')
      .eq('status', 'queued')
      .order('queued_at', { ascending: true })
      .limit(limit);

    if (jobsError) {
      console.error('[StructureJobsProcess] Error fetching jobs:', jobsError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs', details: jobsError.message },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        processed: 0,
        succeeded: 0,
        failed: 0,
        ids: [],
        message: 'No queued jobs to process',
      });
    }

    // Process each job
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      ids: [] as string[],
      errors: [] as Array<{ job_id: string; error: string }>,
    };

    for (const job of jobs) {
      results.ids.push(job.id);
      results.processed++;

      try {
        await runStructureJob(supabaseAdmin, job.id);
        results.succeeded++;
        console.log(`[StructureJobsProcess] Job ${job.id} succeeded`);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push({
          job_id: job.id,
          error: errorMessage,
        });
        console.error(`[StructureJobsProcess] Job ${job.id} failed:`, errorMessage);
        // Continue processing other jobs even if one fails
      }
    }

    return NextResponse.json({
      processed: results.processed,
      succeeded: results.succeeded,
      failed: results.failed,
      ids: results.ids,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('[StructureJobsProcess] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
