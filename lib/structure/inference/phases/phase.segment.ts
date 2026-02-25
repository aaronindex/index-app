// lib/structure/inference/phases/phase.segment.ts
// Segments arc signals into phases using temporal breakpoints
// Deterministic and stable segmentation based on time gaps

import crypto from 'crypto';
import type { StructuralSignal } from '../../signals';
import { bucketTimestamp } from '../../hash';

/**
 * Phase segmentation constants
 */
export const PHASE_GAP_DAYS = 7; // Gap threshold for creating new phase
export const PHASE_ACTIVE_WINDOW_DAYS = 21; // Window for active status

/**
 * Phase segment
 * Represents a contiguous segment of signals within an arc
 */
export type PhaseSegment = {
  phase_key: string;       // deterministic stable key
  arc_id: string;
  start_at: string;       // thinking time (ISO)
  end_at: string;         // thinking time (ISO)
  last_signal_at: string; // == end_at
  decision_count: number;
  result_count: number;
  project_ids: string[];  // deduped, sorted
};

/**
 * Bucket a timestamp to day boundary for phase key generation
 */
function bucketDay(iso: string): string {
  return bucketTimestamp(iso, 'day');
}

/**
 * Generate deterministic phase key
 * phase_key = sha256(user_id + ":" + arc_id + ":" + bucketDay(start_at))
 */
function generatePhaseKey(userId: string, arcId: string, startAt: string): string {
  const bucketedStart = bucketDay(startAt);
  const hashInput = `${userId}:${arcId}:${bucketedStart}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

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
 * Segment arc signals into phases based on time gaps
 * 
 * Rules:
 * - Signals must be pre-sorted by occurred_at (thinking time)
 * - Create new phase when gap between consecutive signals exceeds PHASE_GAP_DAYS
 * - Phase key is deterministic based on user_id + arc_id + bucketed start_at
 * - Accumulate project_ids, decision_count, result_count per phase
 * 
 * @param params - Parameters for phase segmentation
 * @returns Array of phase segments
 */
export function segmentArcIntoPhases(params: {
  arc_id: string;
  user_id: string;
  signals: StructuralSignal[]; // signals within this arc, sorted by occurred_at
}): PhaseSegment[] {
  const { arc_id, user_id, signals } = params;

  if (signals.length === 0) {
    return [];
  }

  const phases: PhaseSegment[] = [];
  let currentPhase: {
    start_at: string;
    end_at: string;
    last_signal_at: string;
    project_ids: Set<string>;
    decision_count: number;
    result_count: number;
  } | null = null;

  for (const signal of signals) {
    // Initialize first phase
    if (!currentPhase) {
      currentPhase = {
        start_at: signal.occurred_at,
        end_at: signal.occurred_at,
        last_signal_at: signal.occurred_at,
        project_ids: new Set<string>(),
        decision_count: 0,
        result_count: 0,
      };
    } else {
      // Check if gap exceeds threshold
      const gapDays = daysBetween(currentPhase.last_signal_at, signal.occurred_at);
      
      if (gapDays > PHASE_GAP_DAYS) {
        // Finalize current phase
        const phaseKey = generatePhaseKey(user_id, arc_id, currentPhase.start_at);
        phases.push({
          phase_key: phaseKey,
          arc_id,
          start_at: currentPhase.start_at,
          end_at: currentPhase.end_at,
          last_signal_at: currentPhase.last_signal_at,
          project_ids: Array.from(currentPhase.project_ids).sort(),
          decision_count: currentPhase.decision_count,
          result_count: currentPhase.result_count,
        });

        // Start new phase
        currentPhase = {
          start_at: signal.occurred_at,
          end_at: signal.occurred_at,
          last_signal_at: signal.occurred_at,
          project_ids: new Set<string>(),
          decision_count: 0,
          result_count: 0,
        };
      } else {
        // Extend current phase
        currentPhase.end_at = signal.occurred_at;
        currentPhase.last_signal_at = signal.occurred_at;
      }
    }

    // Accumulate signal data into current phase
    if (signal.project_id) {
      currentPhase.project_ids.add(signal.project_id);
    }

    if (signal.kind === 'decision') {
      currentPhase.decision_count++;
    } else if (signal.kind === 'result') {
      currentPhase.result_count++;
    }
  }

  // Finalize last phase
  if (currentPhase) {
    const phaseKey = generatePhaseKey(user_id, arc_id, currentPhase.start_at);
    phases.push({
      phase_key: phaseKey,
      arc_id,
      start_at: currentPhase.start_at,
      end_at: currentPhase.end_at,
      last_signal_at: currentPhase.last_signal_at,
      project_ids: Array.from(currentPhase.project_ids).sort(),
      decision_count: currentPhase.decision_count,
      result_count: currentPhase.result_count,
    });
  }

  return phases;
}
