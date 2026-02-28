// lib/structure/hash/stateHash.assertions.ts
// Dev-only deterministic ordering checks for StructuralStatePayload.
// Non-mutating: validates and logs warnings only, never throws in production.

import type { StructuralStatePayload } from './stateHash.types';

function isDevEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
  );
}

function isSortedLexically(values: string[]): boolean {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] > values[i]) {
      return false;
    }
  }
  return true;
}

function recordKeysSorted(record: Record<string, unknown>): boolean {
  const keys = Object.keys(record);
  const sorted = [...keys].sort();
  if (keys.length !== sorted.length) return false;
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] !== sorted[i]) return false;
  }
  return true;
}

/**
 * Dev-only deterministic ordering checker for structural payload.
 *
 * Verifies (without mutation):
 * - Arrays are lexically sorted
 * - Record keys appear in sorted order
 *
 * Logs structured warnings with reason codes; never logs payload contents.
 */
export function devAssertDeterministicStructuralPayload(
  payload: StructuralStatePayload,
  context: string
): void {
  if (!isDevEnv()) return;

  const reasons: string[] = [];

  // Array ordering checks
  if (!Array.isArray(payload.active_arc_ids) || !isSortedLexically(payload.active_arc_ids as string[])) {
    reasons.push('unordered_active_arc_ids');
  }
  if (!Array.isArray(payload.active_phase_ids) || !isSortedLexically(payload.active_phase_ids as string[])) {
    reasons.push('unordered_active_phase_ids');
  }
  if (!Array.isArray(payload.tension_edges) || !isSortedLexically(payload.tension_edges as string[])) {
    reasons.push('unordered_tension_edges');
  }
  if (!Array.isArray(payload.pulse_types) || !isSortedLexically(payload.pulse_types as string[])) {
    reasons.push('unordered_pulse_types');
  }

  // Record key ordering checks
  if (!recordKeysSorted(payload.arc_statuses)) {
    reasons.push('unordered_arc_statuses_keys');
  }
  if (!recordKeysSorted(payload.arc_last_signal_buckets)) {
    reasons.push('unordered_arc_last_signal_buckets_keys');
  }
  if (!recordKeysSorted(payload.phase_statuses)) {
    reasons.push('unordered_phase_statuses_keys');
  }
  if (!recordKeysSorted(payload.phase_last_signal_buckets)) {
    reasons.push('unordered_phase_last_signal_buckets_keys');
  }
  if (!recordKeysSorted(payload.friction_score_buckets)) {
    reasons.push('unordered_friction_score_buckets_keys');
  }

  if (reasons.length === 0) {
    return;
  }

  // Dev-only structured warning; no payload data is logged.
  // eslint-disable-next-line no-console
  console.warn('[StructuralPayloadOrdering][NonDeterministic]', {
    context,
    reasons,
    meta: {
      active_arc_ids_length: Array.isArray(payload.active_arc_ids) ? payload.active_arc_ids.length : null,
      active_phase_ids_length: Array.isArray(payload.active_phase_ids) ? payload.active_phase_ids.length : null,
      tension_edges_length: Array.isArray(payload.tension_edges) ? payload.tension_edges.length : null,
      pulse_types_length: Array.isArray(payload.pulse_types) ? payload.pulse_types.length : null,
      arc_statuses_key_count: Object.keys(payload.arc_statuses || {}).length,
      arc_last_signal_buckets_key_count: Object.keys(payload.arc_last_signal_buckets || {}).length,
      phase_statuses_key_count: Object.keys(payload.phase_statuses || {}).length,
      phase_last_signal_buckets_key_count: Object.keys(payload.phase_last_signal_buckets || {}).length,
      friction_score_buckets_key_count: Object.keys(payload.friction_score_buckets || {}).length,
    },
  });
}

