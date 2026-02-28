// lib/structure/projection/direction.project.ts
// Read-only projection: structural payload → Direction (external language)
// No inference changes. No new writes. Deterministic map only.

import type { StructuralStatePayload } from '../hash';

export type DirectionProjection = {
  activeContainers: number;
  activeDirectionUnits: number;
  densityLevel: number;
  lastStructuralChangeAt: string | null;
};

/**
 * Project structural state payload to Direction (canonical external state).
 * Maps internal fields only. No editorial content. No new semantics.
 */
export function projectDirection(payload: StructuralStatePayload): DirectionProjection {
  const arcBuckets = payload.arc_last_signal_buckets || {};
  const timestamps = Object.values(arcBuckets).filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
  const lastStructuralChangeAt =
    timestamps.length > 0 ? timestamps.sort().reverse()[0]! : null;

  return {
    activeContainers: (payload.active_arc_ids || []).length,
    activeDirectionUnits: (payload.active_phase_ids || []).length,
    densityLevel: typeof payload.decision_density_bucket === 'number' ? payload.decision_density_bucket : 0,
    lastStructuralChangeAt,
  };
}
