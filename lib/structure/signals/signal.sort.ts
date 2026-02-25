// lib/structure/signals/signal.sort.ts
// Deterministic temporal normalization for structural signals
// Ensures identical ordering across environments

import type { StructuralSignal } from './signal.types';

/**
 * Sort signals deterministically by temporal order
 * 
 * Primary sort: occurred_at (ascending)
 * Tie-breaker 1: kind (alphabetical, stable)
 * Tie-breaker 2: id (alphabetical, stable)
 * 
 * This produces identical ordering across multiple runs
 * for the same input data.
 */
export function sortSignals(signals: StructuralSignal[]): StructuralSignal[] {
  return [...signals].sort((a, b) => {
    // Primary: occurred_at ascending
    const timeA = new Date(a.occurred_at).getTime();
    const timeB = new Date(b.occurred_at).getTime();
    
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    
    // Tie-breaker 1: kind (alphabetical)
    if (a.kind !== b.kind) {
      return a.kind.localeCompare(b.kind);
    }
    
    // Tie-breaker 2: id (alphabetical, stable)
    return a.id.localeCompare(b.id);
  });
}
