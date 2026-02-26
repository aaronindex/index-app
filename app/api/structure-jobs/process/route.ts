// app/api/structure-jobs/process/route.ts
// Manual processor endpoint for structure_jobs
// Processes queued structure jobs by calling runStructureJob()

import { NextRequest, NextResponse } from 'next/server';
import { runStructureJob } from '@/lib/structure/jobs/job.processor';
import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase service role client (bypasses RLS)
 * Uses existing pattern from other API routes
 */
function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role credentials not configured');
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * POST /api/structure-jobs/process
 * 
 * Processes queued structure_jobs.
 * 
 * Authentication:
 * - Requires header `x-index-admin-secret` matching `INDEX_ADMIN_SECRET` env var
 * 
 * Body (optional):
 * - limit?: number (default 5, max 25)
 * 
 * Behavior:
 * - Finds up to `limit` queued jobs (oldest first)
 * - For each job: calls runStructureJob() with service-role client
 * - Returns summary with job IDs arrays
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

    // Parse limit from body (optional)
    let limit = 5;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.limit && typeof body.limit === 'number') {
        limit = Math.min(Math.max(1, body.limit), 25); // Max 25
      }
    } catch {
      // Body parsing failed or empty, use default
    }

    // Get service-role Supabase client
    const supabaseAdmin = getSupabaseServiceClient();

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
        job_ids: [],
        succeeded: [],
        failed: [],
      });
    }

    // Process each job
    const job_ids: string[] = [];
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const job of jobs) {
      job_ids.push(job.id);

      try {
        await runStructureJob(supabaseAdmin, job.id);
        succeeded.push(job.id);
        console.log(`[StructureJobsProcess] Job ${job.id} succeeded`);
      } catch (error) {
        failed.push(job.id);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[StructureJobsProcess] Job ${job.id} failed:`, errorMessage);
        // Continue processing other jobs even if one fails
      }
    }

    return NextResponse.json({
      processed: job_ids.length,
      job_ids,
      succeeded,
      failed,
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
