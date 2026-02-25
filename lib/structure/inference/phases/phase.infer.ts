// lib/structure/inference/phases/phase.infer.ts
// Phase inference orchestrator
// Segments arc signals into phases, upserts phases, builds phase state

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuralSignal } from '../../signals';
import { bucketTimestamp } from '../../hash';
import { segmentArcIntoPhases } from './phase.segment';
import { upsertPhase } from './phase.upsert';
import { computePhaseStatus } from './phase.status';

/**
 * Infer phases for arcs and build phase state
 * 
 * Behavior:
 * 1. For each arc, segment its signals into phases
 * 2. Upsert phases
 * 3. Determine active phases (status === active)
 * 4. Build phase state with:
 *    - active_phase_ids (sorted)
 *    - phase_statuses (record, key-sorted)
 *    - phase_last_signal_buckets (bucketed timestamps)
 * 
 * @param params - Phase inference parameters
 * @returns Phase state for structural payload
 */
export async function inferPhasesForArcs(params: {
  supabaseAdminClient: SupabaseClient;
  user_id: string;
  scope: "user";
  nowIso: string;
  // mapping from arc_id -> signals belonging to that arc
  arcSignals: Record<string, StructuralSignal[]>;
}): Promise<{
  active_phase_ids: string[];
  phase_statuses: Record<string, string>;
  phase_last_signal_buckets: Record<string, string>;
}> {
  const { supabaseAdminClient, user_id, nowIso, arcSignals } = params;

  const phaseIds: string[] = [];
  const phaseStatuses: Record<string, string> = {};
  const phaseLastSignalBuckets: Record<string, string> = {};

  // Process each arc's signals
  for (const [arcId, signals] of Object.entries(arcSignals)) {
    if (signals.length === 0) {
      continue; // Skip arcs with no signals
    }

    // Segment arc signals into phases
    const phaseSegments = segmentArcIntoPhases({
      arc_id: arcId,
      user_id,
      signals,
    });

    // Upsert phases and collect state
    for (const segment of phaseSegments) {
      const status = computePhaseStatus(segment.last_signal_at, nowIso);

      const { phase_id } = await upsertPhase(supabaseAdminClient, {
        arc_id: arcId,
        phase_key: segment.phase_key,
        start_at: segment.start_at,
        end_at: segment.end_at,
        last_signal_at: segment.last_signal_at,
        status,
      });

      phaseIds.push(phase_id);
      // Store status as "compressed" in payload (not "dormant") for consistency with arc status
      phaseStatuses[phase_id] = status; // status is already "active" or "compressed"
      phaseLastSignalBuckets[phase_id] = bucketTimestamp(segment.last_signal_at, 'hour');
    }
  }

  // Determine active phases
  const activePhaseIds = phaseIds.filter(phaseId => phaseStatuses[phaseId] === 'active').sort();

  // Sort phase_statuses keys for determinism
  const sortedPhaseStatuses: Record<string, string> = {};
  const sortedPhaseIds = [...phaseIds].sort();
  for (const phaseId of sortedPhaseIds) {
    sortedPhaseStatuses[phaseId] = phaseStatuses[phaseId];
  }

  // Sort phase_last_signal_buckets keys for determinism
  const sortedPhaseLastSignalBuckets: Record<string, string> = {};
  for (const phaseId of sortedPhaseIds) {
    sortedPhaseLastSignalBuckets[phaseId] = phaseLastSignalBuckets[phaseId];
  }

  return {
    active_phase_ids: activePhaseIds,
    phase_statuses: sortedPhaseStatuses,
    phase_last_signal_buckets: sortedPhaseLastSignalBuckets,
  };
}
