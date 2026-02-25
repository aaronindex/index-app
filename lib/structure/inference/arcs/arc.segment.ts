// lib/structure/inference/arcs/arc.segment.ts
// Segments structural signals into contiguous arc segments in thinking time
// Deterministic and stable segmentation based on time gaps

import crypto from 'crypto';
import type { StructuralSignal } from '../../signals';
import { bucketTimestamp } from '../../hash';

/**
 * Arc segmentation constants
 */
export const ARC_GAP_DAYS = 14; // Gap threshold for creating new segment
export const ARC_ACTIVE_WINDOW_DAYS = 45; // Window for active status

/**
 * Arc segment
 * Represents a contiguous segment of structural signals in thinking time
 */
export type ArcSegment = {
  segment_key: string;        // deterministic, stable for idempotent upsert
  start_at: string;           // thinking time (ISO)
  end_at: string;             // thinking time (max signal occurred_at, ISO)
  last_signal_at: string;     // == end_at
  project_ids: string[];      // all project_ids seen in segment (deduped, sorted)
  decision_count: number;
  result_count: number;
};

/**
 * Bucket a timestamp to day boundary for segment key generation
 */
function bucketDay(iso: string): string {
  return bucketTimestamp(iso, 'day');
}

/**
 * Generate deterministic segment key
 * segment_key = sha256(user_id + ":" + bucketDay(start_at))
 */
function generateSegmentKey(userId: string, startAt: string): string {
  const bucketedStart = bucketDay(startAt);
  const hashInput = `${userId}:${bucketedStart}`;
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
 * Segment signals into arcs based on time gaps
 * 
 * Rules:
 * - Signals must be pre-sorted by occurred_at (thinking time)
 * - Create new segment when gap between consecutive signals exceeds ARC_GAP_DAYS
 * - Segment key is deterministic based on user_id + bucketed start_at
 * - Accumulate project_ids, decision_count, result_count per segment
 * 
 * @param signals - Structural signals (must be sorted by occurred_at)
 * @param userId - User ID for segment key generation
 * @returns Array of arc segments
 */
export function segmentSignalsIntoArcs(
  signals: StructuralSignal[],
  userId: string
): ArcSegment[] {
  if (signals.length === 0) {
    return [];
  }

  const segments: ArcSegment[] = [];
  let currentSegment: {
    start_at: string;
    end_at: string;
    last_signal_at: string;
    project_ids: Set<string>;
    decision_count: number;
    result_count: number;
  } | null = null;

  for (const signal of signals) {
    // Initialize first segment
    if (!currentSegment) {
      currentSegment = {
        start_at: signal.occurred_at,
        end_at: signal.occurred_at,
        last_signal_at: signal.occurred_at,
        project_ids: new Set<string>(),
        decision_count: 0,
        result_count: 0,
      };
    } else {
      // Check if gap exceeds threshold
      const gapDays = daysBetween(currentSegment.last_signal_at, signal.occurred_at);
      
      if (gapDays > ARC_GAP_DAYS) {
        // Finalize current segment
        const segmentKey = generateSegmentKey(userId, currentSegment.start_at);
        segments.push({
          segment_key: segmentKey,
          start_at: currentSegment.start_at,
          end_at: currentSegment.end_at,
          last_signal_at: currentSegment.last_signal_at,
          project_ids: Array.from(currentSegment.project_ids).sort(),
          decision_count: currentSegment.decision_count,
          result_count: currentSegment.result_count,
        });

        // Start new segment
        currentSegment = {
          start_at: signal.occurred_at,
          end_at: signal.occurred_at,
          last_signal_at: signal.occurred_at,
          project_ids: new Set<string>(),
          decision_count: 0,
          result_count: 0,
        };
      } else {
        // Extend current segment
        currentSegment.end_at = signal.occurred_at;
        currentSegment.last_signal_at = signal.occurred_at;
      }
    }

    // Accumulate signal data into current segment
    if (signal.project_id) {
      currentSegment.project_ids.add(signal.project_id);
    }

    if (signal.kind === 'decision') {
      currentSegment.decision_count++;
    } else if (signal.kind === 'result') {
      currentSegment.result_count++;
    }
  }

  // Finalize last segment
  if (currentSegment) {
    const segmentKey = generateSegmentKey(userId, currentSegment.start_at);
    segments.push({
      segment_key: segmentKey,
      start_at: currentSegment.start_at,
      end_at: currentSegment.end_at,
      last_signal_at: currentSegment.last_signal_at,
      project_ids: Array.from(currentSegment.project_ids).sort(),
      decision_count: currentSegment.decision_count,
      result_count: currentSegment.result_count,
    });
  }

  return segments;
}
