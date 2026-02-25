// lib/structure/jobs/job.processor.ts
// Structure job processor skeleton
// Executes a single deterministic "structure cycle" for a user/scope

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectStructuralSignals } from '../signals';
import { sortSignals } from '../signals';
import { computeStateHash } from '../hash';
import type { StructuralStatePayload } from '../hash';
import { inferArcsAndBuildState } from '../inference/arcs';
import { loadLatestSnapshot, writeSnapshotState, createMinimalPulses } from '../snapshot';
import { JobNotFoundError, MissingThinkingTimeError } from './job.errors';

/**
 * Get Supabase service role client for admin operations
 */
function getSupabaseServiceClient(): SupabaseClient {
  const { createClient } = require('@supabase/supabase-js');
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
 * Run a structure job
 * 
 * Processor responsibilities:
 * - Load job
 * - Mark running (started_at)
 * - Execute placeholder "structure cycle":
 *   - collectStructuralSignals(user_id)
 *   - (placeholder) build empty structural payload object OR minimal scaffolding
 *   - DO NOT compute arcs/phases yet
 *   - computeStateHash(payload) using the hash engine
 * - Mark succeeded (finished_at)
 * 
 * Failure behavior:
 * - Catch errors
 * - Mark failed + store error string
 * - Rethrow (so callers/logs see it)
 * 
 * @param supabaseAdminClient - Service role client (bypasses RLS)
 * @param jobId - Job ID to process
 * @throws MissingThinkingTimeError if signal collection fails due to missing thinking time
 * @throws JobNotFoundError if job doesn't exist
 */
export async function runStructureJob(
  supabaseAdminClient: SupabaseClient,
  jobId: string
): Promise<void> {
  // Load job
  const { data: job, error: jobError } = await supabaseAdminClient
    .from('structure_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new JobNotFoundError(jobId);
  }

  // Check job status
  if (job.status !== 'queued') {
    throw new Error(
      `[StructureJob] Job ${jobId} is not queued (status: ${job.status})`
    );
  }

  const payload = job.payload as {
    scope: string;
    user_id: string;
    reason: string;
  };

  // Mark running
  const startedAt = new Date().toISOString();
  await supabaseAdminClient
    .from('structure_jobs')
    .update({
      status: 'running',
      started_at: startedAt,
    })
    .eq('id', jobId);

  try {
    // Execute structure cycle
    // Step 1: Collect structural signals
    const signals = await collectStructuralSignals(
      supabaseAdminClient,
      payload.user_id
    );

    // Step 2: Sort signals by occurred_at (required for segmentation)
    const sortedSignals = sortSignals(signals);

    // Step 3: Infer arcs and build structural state payload
    const nowIso = new Date().toISOString();
    const structuralPayload = await inferArcsAndBuildState(
      supabaseAdminClient,
      payload.user_id,
      payload.scope as "user",
      sortedSignals,
      nowIso
    );

    // Step 4: Compute state hash
    const stateHash = computeStateHash(structuralPayload);

    // Step 5: Load latest snapshot for hash comparison
    const latestSnapshot = await loadLatestSnapshot(
      supabaseAdminClient,
      payload.user_id,
      payload.scope
    );

    // Step 6: Hash gating - exit early if hash unchanged
    if (latestSnapshot && latestSnapshot.state_hash === stateHash) {
      // Hash unchanged - no structural change, exit early
      const finishedAt = new Date().toISOString();
      await supabaseAdminClient
        .from('structure_jobs')
        .update({
          status: 'succeeded',
          finished_at: finishedAt,
          error: null,
        })
        .eq('id', jobId);

      console.log(
        `[StructureJob] Job ${jobId} succeeded (hash unchanged). Signals: ${signals.length}, State hash: ${stateHash.substring(0, 16)}...`
      );
      return; // Exit early - no snapshot or pulses needed
    }

    // Step 7: Hash changed - write new snapshot and create pulses
    // Use prevPayload from latest snapshot (if available)
    const prevPayload: StructuralStatePayload | null = latestSnapshot?.state_payload || null;

    // Write new snapshot with normalized payload
    const { snapshot_id } = await writeSnapshotState(
      supabaseAdminClient,
      payload.user_id,
      payload.scope,
      stateHash,
      structuralPayload
    );

    // Create minimal pulses based on structural changes
    const pulseTypes = await createMinimalPulses(
      supabaseAdminClient,
      payload.user_id,
      payload.scope,
      prevPayload,
      structuralPayload,
      stateHash
    );

    // Mark succeeded
    const finishedAt = new Date().toISOString();
    await supabaseAdminClient
      .from('structure_jobs')
      .update({
        status: 'succeeded',
        finished_at: finishedAt,
        error: null,
      })
      .eq('id', jobId);

    // Log success (for debugging)
    console.log(
      `[StructureJob] Job ${jobId} succeeded. Signals: ${signals.length}, State hash: ${stateHash.substring(0, 16)}..., Snapshot: ${snapshot_id}, Pulses: ${pulseTypes.length}`
    );
  } catch (error) {
    // Mark failed + store error string
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = errorMessage.length > 1000
      ? errorMessage.substring(0, 1000) + '...'
      : errorMessage;

    await supabaseAdminClient
      .from('structure_jobs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error: errorString,
      })
      .eq('id', jobId);

    // Wrap signal collector errors in MissingThinkingTimeError
    if (errorMessage.includes('Missing thinking time') || errorMessage.includes('signals')) {
      throw new MissingThinkingTimeError(errorMessage, { jobId, userId: payload.user_id });
    }

    // Rethrow so callers/logs see it
    throw error;
  }
}
