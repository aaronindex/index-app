// lib/structure/projection/shifts.project.ts
// Read-only projection: prev + current payload → Shifts (external language)
// Wraps pulse logic; no new meaning. Deterministic map only.

import type { StructuralStatePayload } from '../hash';

export type ShiftsProjection = {
  hasShift: boolean;
  shiftTypes: string[];
};

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Project prev + current structural payload to Shifts (canonical external changes).
 * Same logic as pulse detection; returns external names only.
 */
export function projectShifts(
  prevPayload: StructuralStatePayload | null,
  currentPayload: StructuralStatePayload
): ShiftsProjection {
  const shiftTypes: string[] = [];

  if (!prevPayload) {
    return { hasShift: false, shiftTypes: [] };
  }

  if (!arraysEqual(prevPayload.active_arc_ids || [], currentPayload.active_arc_ids || [])) {
    shiftTypes.push('container_shift');
  }
  if (prevPayload.decision_density_bucket !== currentPayload.decision_density_bucket) {
    shiftTypes.push('direction_intensity_shift');
  }

  return {
    hasShift: shiftTypes.length > 0,
    shiftTypes,
  };
}
