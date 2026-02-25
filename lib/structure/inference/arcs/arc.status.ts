// lib/structure/inference/arcs/arc.status.ts
// Computes arc status (active vs compressed) based on recency
// Silent reactivation: status flips from compressed → active via recomputation

import { ARC_ACTIVE_WINDOW_DAYS } from './arc.segment';

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
 * Compute arc status based on last signal recency
 * 
 * Rule:
 * - active if lastSignalAt within ARC_ACTIVE_WINDOW_DAYS of now
 * - else compressed
 * 
 * Reactivation is silent:
 * - status can flip from compressed → active purely via recomputation
 * - as new signals extend/attach to the segment
 * - No explicit "reactivated" messaging
 * 
 * @param lastSignalAtIso - Last signal timestamp (ISO)
 * @param nowIso - Current timestamp (ISO)
 * @returns "active" or "compressed"
 */
export function computeArcStatus(
  lastSignalAtIso: string,
  nowIso: string
): "active" | "compressed" {
  const daysSinceLastSignal = daysBetween(lastSignalAtIso, nowIso);
  
  if (daysSinceLastSignal <= ARC_ACTIVE_WINDOW_DAYS) {
    return 'active';
  } else {
    return 'compressed';
  }
}
