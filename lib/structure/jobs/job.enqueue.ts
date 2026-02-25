// lib/structure/jobs/job.enqueue.ts
// Enqueue structure job with deduplication

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructureJobPayload } from './job.types';
import { shouldEnqueueJob } from './job.dedupe';

/**
 * Enqueue a structure job
 * 
 * Rules:
 * - Compute a deterministic debounce_key if not provided: ${scope}:${reason}
 * - Apply shouldEnqueueJob with a small window (e.g. 30-60s)
 * - Insert job row with status=queued
 * 
 * @param supabaseClient - Supabase client (regular client, RLS applies)
 * @param payload - Job payload
 * @returns Job ID
 */
export async function enqueueStructureJob(
  supabaseClient: SupabaseClient,
  payload: StructureJobPayload
): Promise<{ job_id: string }> {
  // Compute deterministic debounce_key if not provided
  const debounceKey = payload.debounce_key || `${payload.scope}:${payload.reason}`;

  // Check if job should be enqueued (debounce window: 60 seconds)
  const shouldEnqueue = await shouldEnqueueJob(
    supabaseClient,
    payload.user_id,
    debounceKey,
    60 // 60 second window
  );

  if (!shouldEnqueue) {
    throw new Error(
      `[StructureJob] Job already queued/running for user ${payload.user_id} with debounce_key ${debounceKey}`
    );
  }

  // Insert job row
  const { data, error } = await supabaseClient
    .from('structure_jobs')
    .insert({
      user_id: payload.user_id,
      scope: payload.scope,
      type: 'recompute_structure',
      status: 'queued',
      payload: payload,
      debounce_key: debounceKey,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `[StructureJob] Failed to enqueue job: ${error?.message || 'Unknown error'}`
    );
  }

  return { job_id: data.id };
}
