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

function isDevEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
  );
}

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

    // Dev-only: log hash comparison for snapshot debugging
    if (isDevEnv()) {
      const computedPrefix = stateHash.substring(0, 24);
      const latestPrefix = latestSnapshot?.state_hash?.substring(0, 24) ?? '(none)';
      // eslint-disable-next-line no-console
      console.log('[StructureJob][HashGating]', {
        job_id: jobId,
        user_id: payload.user_id,
        scope: payload.scope,
        signals_count: signals.length,
        computed_state_hash_prefix: computedPrefix,
        latest_snapshot_state_hash_prefix: latestPrefix,
        will_skip_write: !!(latestSnapshot && latestSnapshot.state_hash === stateHash),
      });
    }

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

    // Write new global snapshot with normalized payload (scope='user' -> scope='global')
    const { snapshot_id } = await writeSnapshotState(
      supabaseAdminClient,
      payload.user_id,
      payload.scope,
      stateHash,
      structuralPayload,
      null
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

    // Project-scoped snapshots: derive per-project payloads from signals and write snapshots when changed
    const projectIds = Array.from(
      new Set(
        sortedSignals
          .map((s) => s.project_id)
          .filter((id): id is string => !!id)
      )
    );

    if (projectIds.length > 0) {
      if (isDevEnv()) {
        // eslint-disable-next-line no-console
        console.log('[StructureJob][ProjectScopes]', {
          job_id: jobId,
          user_id: payload.user_id,
          scope: payload.scope,
          project_ids: projectIds,
        });
      }

      for (const projectId of projectIds) {
        const projectSignals = sortedSignals.filter(
          (s) => s.project_id === projectId
        );
        if (projectSignals.length === 0) continue;

        const projectPayload = await inferArcsAndBuildState(
          supabaseAdminClient,
          payload.user_id,
          payload.scope as "user",
          projectSignals,
          nowIso
        );

        const projectStateHash = computeStateHash(projectPayload);

        const { data: latestProjectSnapshot, error: latestProjError } =
          await supabaseAdminClient
            .from('snapshot_state')
            .select('id, state_hash')
            .eq('user_id', payload.user_id)
            .eq('scope', 'project')
            .eq('project_id', projectId)
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestProjError && latestProjError.code !== 'PGRST116') {
          throw new Error(
            `[StructureJob] Error loading latest project snapshot for project ${projectId}: ${latestProjError.message}`
          );
        }

        const latestPrefix = latestProjectSnapshot?.state_hash?.substring(0, 24) ?? '(none)';
        const nextPrefix = projectStateHash.substring(0, 24);

        if (
          latestProjectSnapshot &&
          latestProjectSnapshot.state_hash === projectStateHash
        ) {
          if (isDevEnv()) {
            // eslint-disable-next-line no-console
            console.log('[StructureJob][ProjectSnapshotHashUnchanged]', {
              job_id: jobId,
              user_id: payload.user_id,
              project_id: projectId,
              latest_state_hash_prefix: latestPrefix,
              next_state_hash_prefix: nextPrefix,
            });
          }
          continue;
        }

        const { snapshot_id: projectSnapshotId } = await writeSnapshotState(
          supabaseAdminClient,
          payload.user_id,
          'project',
          projectStateHash,
          projectPayload,
          projectId
        );

        if (isDevEnv()) {
          // eslint-disable-next-line no-console
          console.log('[StructureJob][ProjectSnapshotWritten]', {
            job_id: jobId,
            user_id: payload.user_id,
            project_id: projectId,
            snapshot_id: projectSnapshotId,
            state_hash_prefix: nextPrefix,
            signals_count: projectSignals.length,
          });
        }
      }
    }

    // Dev-only idempotency check: detect duplicate snapshots with identical state_hash
    if (isDevEnv()) {
      try {
        const { data: sameHashSnapshots } = await supabaseAdminClient
          .from('snapshot_state')
          .select('id, scope, state_hash, generated_at')
          .eq('user_id', payload.user_id)
          .eq('state_hash', stateHash)
          .order('generated_at', { ascending: false })
          .limit(3);

        if (sameHashSnapshots && sameHashSnapshots.length >= 2) {
          const latest = sameHashSnapshots[0];
          const previous = sameHashSnapshots[1];

          if (latest.scope === previous.scope && latest.state_hash === previous.state_hash) {
            const duplicateCount = sameHashSnapshots.filter(
              (row) => row.scope === latest.scope && row.state_hash === latest.state_hash
            ).length;

            // eslint-disable-next-line no-console
            console.warn('[StructureJobIdempotency][DuplicateSnapshots]', {
              job_id: jobId,
              user_id: payload.user_id,
              scope: latest.scope,
              state_hash_prefix: stateHash.substring(0, 16),
              duplicate_count: duplicateCount,
              reason: 'duplicate_snapshot_same_hash_back_to_back',
            });
          }
        }
      } catch (idempotencyError) {
        // eslint-disable-next-line no-console
        console.warn('[StructureJobIdempotency][CheckFailed]', {
          job_id: jobId,
          user_id: payload.user_id,
          reason: 'idempotency_check_error',
          error_message:
            idempotencyError instanceof Error ? idempotencyError.message : String(idempotencyError),
        });
      }
    }

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

    if (isDevEnv()) {
      const stack = error instanceof Error ? error.stack : undefined;
      // eslint-disable-next-line no-console
      console.error('[StructureJob][Failed]', {
        job_id: jobId,
        user_id: payload?.user_id,
        scope: payload?.scope,
        error_message: errorMessage,
        ...(stack && { stack: stack.split('\n').slice(0, 8).join('\n') }),
      });
    }

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
