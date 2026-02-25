// lib/structure/inference/arcs/arc.infer.ts
// Arc inference orchestrator
// Segments signals, upserts arcs, builds structural state payload

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuralSignal } from '../../signals';
import type { StructuralStatePayload } from '../../hash';
import { bucketTimestamp } from '../../hash';
import { segmentSignalsIntoArcs } from './arc.segment';
import { upsertArcAndLinks } from './arc.upsert';
import { computeDecisionDensityBucket, computeResultDensityBucket } from './arc.density';
import { computeArcStatus } from './arc.status';
import { inferPhasesForArcs } from '../phases';

/**
 * Calculate days between two ISO timestamps
 */
function daysBetween(iso1: string, iso2: string): number {
  const date1 = new Date(iso1);
  const date2 = new Date(iso2);
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Infer arcs and build structural state payload
 * 
 * Behavior:
 * 1. Segment signals into arcs
 * 2. For each segment: upsert arc + links
 * 3. Determine active arcs (status === active)
 * 4. Build StructuralStatePayload with:
 *    - active_arc_ids (sorted)
 *    - arc_statuses (record, key-sorted)
 *    - arc_last_signal_buckets (bucketed timestamps)
 *    - decision_density_bucket
 *    - result_density_bucket
 *    - Empty phase/tension/pulse fields
 * 
 * Important:
 * - Do NOT include editorial
 * - Do NOT include raw timestamps in payload; bucket timestamps
 * 
 * @param supabaseAdminClient - Service role client (bypasses RLS)
 * @param userId - User ID
 * @param scope - Scope (currently only "user")
 * @param signals - Structural signals (must be sorted by occurred_at)
 * @param nowIso - Current timestamp (ISO)
 * @returns Structural state payload
 */
export async function inferArcsAndBuildState(
  supabaseAdminClient: SupabaseClient,
  userId: string,
  scope: "user",
  signals: StructuralSignal[],
  nowIso: string
): Promise<StructuralStatePayload> {
  // Step 1: Segment signals into arcs
  const segments = segmentSignalsIntoArcs(signals, userId);

  // Step 1.5: Map signals to segments for phase inference
  // Group signals by segment (which will become arc_id after upsert)
  // Since segments are created sequentially from sorted signals, we can map efficiently
  const segmentSignals: StructuralSignal[][] = [];
  let signalIndex = 0;

  for (const segment of segments) {
    const segmentSignalList: StructuralSignal[] = [];
    
    // Collect signals within this segment's time window
    // Segments are contiguous, so we can iterate signals sequentially
    while (signalIndex < signals.length) {
      const signal = signals[signalIndex];
      const signalTime = new Date(signal.occurred_at).getTime();
      const segmentStart = new Date(segment.start_at).getTime();
      const segmentEnd = new Date(segment.end_at).getTime();
      
      if (signalTime >= segmentStart && signalTime <= segmentEnd) {
        segmentSignalList.push(signal);
        signalIndex++;
      } else if (signalTime > segmentEnd) {
        // Signal is past this segment, move to next segment
        break;
      } else {
        // Signal is before this segment (shouldn't happen if signals are sorted and segments are sequential)
        // Skip it to avoid infinite loop
        signalIndex++;
      }
    }
    
    segmentSignals.push(segmentSignalList);
  }

  // Step 2: Upsert arcs and links, track arc_id mapping
  const arcIds: string[] = [];
  const arcStatuses: Record<string, string> = {};
  const arcLastSignalBuckets: Record<string, string> = {};
  const arcSignals: Record<string, StructuralSignal[]> = {};

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const { arc_id } = await upsertArcAndLinks(
      supabaseAdminClient,
      userId,
      scope,
      segment,
      nowIso
    );

    arcIds.push(arc_id);

    // Map signals to this arc_id
    arcSignals[arc_id] = segmentSignals[i];

    // Compute status (may have changed after upsert)
    const status = computeArcStatus(segment.last_signal_at, nowIso);
    arcStatuses[arc_id] = status;

    // Bucket last_signal_at for hash
    arcLastSignalBuckets[arc_id] = bucketTimestamp(segment.last_signal_at, 'hour');
  }

  // Step 3: Determine active arcs
  const activeArcIds = arcIds.filter(arcId => arcStatuses[arcId] === 'active').sort();

  // Step 3.5: Infer phases for arcs

  // Infer phases
  const phaseState = await inferPhasesForArcs({
    supabaseAdminClient,
    user_id: userId,
    scope,
    nowIso,
    arcSignals,
  });

  // Step 4: Compute density buckets
  // Aggregate decision and result counts across all segments
  const totalDecisions = segments.reduce((sum, seg) => sum + seg.decision_count, 0);
  const totalResults = segments.reduce((sum, seg) => sum + seg.result_count, 0);

  // Compute span (from earliest start to latest end)
  let spanDays = 1; // Default to 1 to avoid division by zero
  if (segments.length > 0) {
    const earliestStart = segments.reduce((earliest, seg) => 
      seg.start_at < earliest ? seg.start_at : earliest, segments[0].start_at
    );
    const latestEnd = segments.reduce((latest, seg) => 
      seg.end_at > latest ? seg.end_at : latest, segments[0].end_at
    );
    spanDays = Math.max(daysBetween(earliestStart, latestEnd), 1);
  }

  const decisionDensityBucket = computeDecisionDensityBucket(totalDecisions, spanDays);
  const resultDensityBucket = computeResultDensityBucket(totalResults, spanDays);

  // Step 5: Build structural state payload
  // Sort arc_ids for determinism
  const sortedArcIds = [...arcIds].sort();
  
  // Sort arc_statuses keys for determinism
  const sortedArcStatuses: Record<string, string> = {};
  for (const arcId of sortedArcIds) {
    sortedArcStatuses[arcId] = arcStatuses[arcId];
  }

  // Sort arc_last_signal_buckets keys for determinism
  const sortedArcLastSignalBuckets: Record<string, string> = {};
  for (const arcId of sortedArcIds) {
    sortedArcLastSignalBuckets[arcId] = arcLastSignalBuckets[arcId];
  }

  return {
    active_arc_ids: activeArcIds,
    arc_statuses: sortedArcStatuses,
    arc_last_signal_buckets: sortedArcLastSignalBuckets,

    active_phase_ids: phaseState.active_phase_ids,
    phase_statuses: phaseState.phase_statuses,
    phase_last_signal_buckets: phaseState.phase_last_signal_buckets,

    tension_edges: [],
    friction_score_buckets: {},

    decision_density_bucket: decisionDensityBucket,
    result_density_bucket: resultDensityBucket,

    pulse_types: [],
  };
}
