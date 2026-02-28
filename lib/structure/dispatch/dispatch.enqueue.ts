// lib/structure/dispatch/dispatch.enqueue.ts
// Dispatch structure recomputation jobs with debouncing

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DispatchStructureRecomputeParams } from './dispatch.types';
import { generateDebounceKey } from './dispatch.debounce';
import { enqueueStructureJob } from '../jobs';
import type { StructureJobPayload } from '../jobs';

function isDevEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
  );
}

/**
 * Dispatch structure recomputation job
 * 
 * Rules:
 * - debounce_key defaults to ${scope}:${reason}
 * - uses existing enqueueStructureJob() with shouldEnqueueJob() debounce window (60s)
 * - never throws on debounce skip (returns silently)
 * - should throw if enqueue fails for real errors
 * 
 * @param params - Dispatch parameters
 * @returns void (throws only on real errors, not debounce skips)
 */
export async function dispatchStructureRecompute(
  params: DispatchStructureRecomputeParams
): Promise<void> {
  const { supabaseClient, user_id, scope, reason, debounce_key } = params;

  // Generate debounce key if not provided
  const finalDebounceKey = debounce_key || generateDebounceKey(scope, reason);

  // Build job payload
  const jobPayload: StructureJobPayload = {
    scope,
    user_id,
    reason,
    debounce_key: finalDebounceKey,
  };

  try {
    // Enqueue job (will check debounce internally)
    const result = await enqueueStructureJob(supabaseClient as SupabaseClient, jobPayload);
    if (isDevEnv()) {
      // eslint-disable-next-line no-console
      console.log('[StructureDispatch][Enqueued]', {
        user_id,
        scope,
        reason,
        debounce_key: finalDebounceKey,
        job_id: result.job_id,
        debounce_window_seconds: 60,
      });
    }
  } catch (error) {
    // Check if error is due to debounce skip
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('Job already queued/running') || 
        errorMessage.includes('debounce')) {
      if (isDevEnv()) {
        // eslint-disable-next-line no-console
        console.warn('[StructureDispatch][DebounceSkip]', {
          user_id,
          scope,
          reason,
          debounce_key: finalDebounceKey,
          debounce_window_seconds: 60,
          reason_code: 'debounce_skip',
        });
      }
      // Debounce skip - return silently (not an error)
      return;
    }

    // Real error - rethrow
    throw error;
  }
}
