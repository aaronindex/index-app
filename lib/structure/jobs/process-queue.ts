// lib/structure/jobs/process-queue.ts
// Shared logic for processing queued structure_jobs (used by POST /api/structure-jobs/process and GET /api/cron/structure-jobs)

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runStructureJob } from './job.processor';

export type ProcessQueueResult = {
  processed: number;
  job_ids: string[];
  succeeded: string[];
  failed: string[];
};

function getSupabaseServiceClient(): SupabaseClient {
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
 * Find up to `limit` queued structure_jobs (oldest first), run each via runStructureJob, return summary.
 * Uses service-role client internally.
 */
export async function processStructureJobQueue(limit: number): Promise<ProcessQueueResult> {
  const supabaseAdmin = getSupabaseServiceClient();

  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from('structure_jobs')
    .select('id, user_id, scope, type, status, payload')
    .eq('status', 'queued')
    .order('queued_at', { ascending: true })
    .limit(limit);

  if (jobsError) {
    throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
  }

  if (!jobs || jobs.length === 0) {
    return { processed: 0, job_ids: [], succeeded: [], failed: [] };
  }

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
    }
  }

  return {
    processed: job_ids.length,
    job_ids,
    succeeded,
    failed,
  };
}
