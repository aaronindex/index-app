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
 * Resolve a fully-qualified app base URL (with protocol) for server-side fetch.
 * Prefers NEXT_PUBLIC_APP_URL (normalized to https if no protocol); else VERCEL_URL; else localhost.
 */
function getAppBaseUrl(): string {
  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromApp) {
    const lower = fromApp.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://')) return fromApp;
    return `https://${fromApp.replace(/^\/+/, '')}`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
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

type SemanticTriggerParams = {
  user_id: string;
  scope_type: 'global' | 'project';
  scope_id: string | null;
  state_hash: string;
  arc_ids: string[];
  /** For global scope only: state_hash used to fetch recent pulse ids */
  state_hash_for_pulses?: string;
  /** Optional stats for Direction generation (global scope) */
  stats?: {
    active_arc_count: number;
    pulse_count: number;
    outcome_count: number;
    decision_count: number;
    project_count: number;
  };
};

/**
 * Trigger semantic overlay generation if missing for this scope/state_hash.
 * Existence check: user_id + scope_type + scope_id IS NOT DISTINCT FROM + state_hash.
 * If semantics already exist for that state_hash, skip generation (avoids duplicate requests).
 * Non-blocking: call .catch() from caller. Does not alter state_hash inputs.
 */
async function triggerSemanticGenerate(
  supabaseAdminClient: SupabaseClient,
  params: SemanticTriggerParams
): Promise<void> {
  const { user_id, scope_type, scope_id, state_hash, arc_ids, state_hash_for_pulses, stats: statsParam } = params;

  // Patch 1 & 5: Short-circuit if semantic_labels already has rows for (user_id, scope_type, scope_id, state_hash)
  let q = supabaseAdminClient
    .from('semantic_labels')
    .select('id')
    .eq('user_id', user_id)
    .eq('scope_type', scope_type)
    .eq('state_hash', state_hash)
    .limit(1);

  if (scope_type === 'global') {
    q = q.is('scope_id', null);
  } else {
    q = q.eq('scope_id', scope_id);
  }

  const { data: existing } = await q;
  if (existing && existing.length > 0) {
    return;
  }

  // Patch 3: Fetch arc context (id, phase, summary, started_at, last_signal_at)
  type ArcRow = { id: string; summary: string | null; created_at: string | null; last_signal_at: string | null };
  type PhaseRow = { arc_id: string; phase_index: number; summary: string | null; started_at: string | null; last_signal_at: string | null };
  let arcs: Array<{ id: string; phase: number | null; summary: string | null; started_at: string | null; last_signal_at: string | null }> = [];
  if (arc_ids.length > 0) {
    const { data: arcRows } = await supabaseAdminClient
      .from('arc')
      .select('id, summary, created_at, last_signal_at')
      .eq('user_id', user_id)
      .in('id', arc_ids);
    const arcList = (arcRows ?? []) as ArcRow[];

    // C1: Deterministic phase selection — ORDER BY phase_index DESC, created_at DESC; take first row per arc
    const { data: phaseRows } = await supabaseAdminClient
      .from('phase')
      .select('arc_id, phase_index, summary, started_at, last_signal_at')
      .in('arc_id', arc_ids)
      .order('phase_index', { ascending: false })
      .order('created_at', { ascending: false });
    const phasesByArc = new Map<string, PhaseRow>();
    for (const row of (phaseRows ?? []) as PhaseRow[]) {
      if (!phasesByArc.has(row.arc_id)) phasesByArc.set(row.arc_id, row);
    }

    arcs = arcList.map((arc) => {
      const phase = phasesByArc.get(arc.id);
      return {
        id: arc.id,
        phase: phase?.phase_index ?? null,
        summary: arc.summary ?? null,
        started_at: phase?.started_at ?? arc.created_at ?? null,
        last_signal_at: arc.last_signal_at ?? null,
      };
    });
  }

  // Patch 2: Richer pulse context (id, pulse_type, project_id, occurred_at)
  let pulses: Array<{ id: string; pulse_type: string; project_id: string | null; occurred_at: string }> = [];
  if (scope_type === 'global' && state_hash_for_pulses) {
    const { data: pulseRows } = await supabaseAdminClient
      .from('pulse')
      .select('id, pulse_type, project_id, occurred_at')
      .eq('user_id', user_id)
      .eq('scope', 'global')
      .eq('state_hash', state_hash_for_pulses)
      .order('occurred_at', { ascending: false })
      .limit(50);
    pulses = (pulseRows ?? []).map((r: { id: string; pulse_type: string; project_id: string | null; occurred_at: string }) => ({
      id: r.id,
      pulse_type: r.pulse_type ?? '',
      project_id: r.project_id ?? null,
      occurred_at: r.occurred_at ?? new Date().toISOString(),
    }));
  }

  const baseUrl = getAppBaseUrl();
  const generateUrl = new URL('/api/admin/semantic/generate', baseUrl).toString();

  const secret = process.env.INDEX_ADMIN_SECRET;
  if (!secret) {
    if (isDevEnv()) {
      // eslint-disable-next-line no-console
      console.warn('[SemanticTrigger] INDEX_ADMIN_SECRET not set, skipping generate');
    }
    return;
  }

  const body: Record<string, unknown> = {
    user_id,
    scope_type,
    scope_id: scope_id ?? undefined,
    state_hash,
    arcs: arcs.length > 0 ? arcs : arc_ids.map((id) => ({ id, phase: null, summary: null, started_at: null, last_signal_at: null })),
    pulses,
  };
  if (statsParam) {
    body.stats = { ...statsParam, pulse_count: pulses.length };
  }

  if (isDevEnv()) {
    // eslint-disable-next-line no-console
    console.log('[SemanticTrigger]', {
      base_url: baseUrl,
      generate_url: generateUrl,
      state_hash_prefix: state_hash.substring(0, 16),
      arc_count: arcs.length || arc_ids.length,
      pulse_count: pulses.length,
    });
  }

  const res = await fetch(generateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-index-admin-secret': secret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Semantic generate failed: ${res.status}`);
  }
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

  // For now, structural processing is always user-level.
  // Scope (user/project) is treated as metadata for dedupe and logging.
  const structureScope: "user" = "user";

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
      structureScope,
      sortedSignals,
      nowIso
    );

    // Step 4: Compute state hash
    const stateHash = computeStateHash(structuralPayload);

    // Step 5: Load latest snapshot for hash comparison
    const latestSnapshot = await loadLatestSnapshot(
      supabaseAdminClient,
      payload.user_id,
      structureScope
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
      structureScope,
      stateHash,
      structuralPayload,
      null
    );

    // Create minimal pulses based on structural changes
    const pulseTypes = await createMinimalPulses(
      supabaseAdminClient,
      payload.user_id,
      structureScope,
      prevPayload,
      structuralPayload,
      stateHash
    );

    // Project-scoped snapshots: derive per-project payloads from signals (needed for stats and loop)
    const projectIds = Array.from(
      new Set(
        sortedSignals
          .map((s) => s.project_id)
          .filter((id): id is string => !!id)
      )
    );

    // Semantic overlay: trigger generation for global scope if missing (fire-and-forget)
    const activeArcIds = structuralPayload.active_arc_ids ?? [];
    // C4: decision_count is decision-type signals only (excludes result and other kinds)
    const decisionCount = sortedSignals.filter((s) => s.kind === 'decision').length;
    // C2: Outcome count currently reflects global user outcomes; project-scoped counts may be added later.
    const { count: outcomeCount } = await supabaseAdminClient
      .from('project_outcome')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', payload.user_id);
    triggerSemanticGenerate(supabaseAdminClient, {
      user_id: payload.user_id,
      scope_type: 'global',
      scope_id: null,
      state_hash: stateHash,
      arc_ids: activeArcIds,
      state_hash_for_pulses: stateHash,
      stats: {
        active_arc_count: activeArcIds.length,
        pulse_count: 0,
        outcome_count: outcomeCount ?? 0,
        decision_count: decisionCount,
        project_count: projectIds.length,
      },
    }).catch((err) => {
      if (isDevEnv()) {
        // eslint-disable-next-line no-console
        console.warn('[StructureJob][SemanticTrigger]', { error: err instanceof Error ? err.message : String(err) });
      }
    });

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
          structureScope,
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

        triggerSemanticGenerate(supabaseAdminClient, {
          user_id: payload.user_id,
          scope_type: 'project',
          scope_id: projectId,
          state_hash: projectStateHash,
          arc_ids: projectPayload.active_arc_ids ?? [],
        }).catch((err) => {
          if (isDevEnv()) {
            // eslint-disable-next-line no-console
            console.warn('[StructureJob][SemanticTrigger][Project]', { project_id: projectId, error: err instanceof Error ? err.message : String(err) });
          }
        });

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
