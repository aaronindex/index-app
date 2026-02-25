// lib/structure/jobs/job.dedupe.ts
// Deduplication and debouncing logic for structure jobs

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a job should be enqueued based on debounce window
 * 
 * If a queued/running job exists for same user+debounceKey within window → return false
 * Else true
 * 
 * @param supabaseClient - Supabase client (can be regular or service role)
 * @param userId - User ID
 * @param debounceKey - Debounce key to check
 * @param windowSeconds - Time window in seconds (e.g., 30-60)
 * @returns true if job should be enqueued, false if should be skipped
 */
export async function shouldEnqueueJob(
  supabaseClient: SupabaseClient,
  userId: string,
  debounceKey: string,
  windowSeconds: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { data, error } = await supabaseClient
    .from('structure_jobs')
    .select('id')
    .eq('user_id', userId)
    .eq('debounce_key', debounceKey)
    .in('status', ['queued', 'running'])
    .gte('queued_at', windowStart)
    .limit(1)
    .maybeSingle();

  if (error) {
    // If table doesn't exist yet, allow enqueue (migration may not be applied)
    if (error.code === '42P01') {
      console.warn('[StructureJob] structure_jobs table not found, allowing enqueue');
      return true;
    }
    throw error;
  }

  // If a job exists, don't enqueue
  return !data;
}
