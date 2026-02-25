// lib/structure/inference/phases/phase.status.ts
// Computes phase status (active vs compressed) based on recency
// Silent reactivation: status flips from compressed → active via recomputation

import { PHASE_ACTIVE_WINDOW_DAYS } from './phase.segment';

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
 * Compute phase status based on last signal recency
 * 
 * Rule:
 * - active if lastSignalAt within PHASE_ACTIVE_WINDOW_DAYS of now
 * - else compressed
 * 
 * Note: Schema uses "dormant" but we'll map "compressed" → "dormant" for storage
 * 
 * Reactivation is silent:
 * - status can flip from compressed → active purely via recomputation
 * - as new signals extend/attach to the phase
 * - No explicit "reactivated" messaging
 * 
 * @param lastSignalAtIso - Last signal timestamp (ISO)
 * @param nowIso - Current timestamp (ISO)
 * @returns "active" or "compressed" (will be mapped to "dormant" for storage)
 */
export function computePhaseStatus(
  lastSignalAtIso: string,
  nowIso: string
): "active" | "compressed" {
  const daysSinceLastSignal = daysBetween(lastSignalAtIso, nowIso);
  
  if (daysSinceLastSignal <= PHASE_ACTIVE_WINDOW_DAYS) {
    return 'active';
  } else {
    return 'compressed';
  }
}
