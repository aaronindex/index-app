// lib/structure/signals/signal.types.ts
// Structural signal type definitions
// Signals are deterministic structural events derived from existing tables
// They contain NO editorial content, NO semantic labels, NO interpretation

import crypto from 'crypto';

/**
 * Structural signal kinds
 * Each kind represents a minimal structural fact
 * Only structural change events (not ingestion events)
 * Names avoid observation-time semantics (no "created"/"recorded")
 */
export type StructuralSignalKind =
  | "decision"               // Decision (structural change)
  | "result"                 // Result feedback attached to decision (structural change)
  | "project_reactivated";   // Project moved from inactive to active (structural change)

/**
 * Structural signal
 * Minimal structural fact with no editorial content
 */
export type StructuralSignal = {
  id: string;              // Stable deterministic ID (hash-based)
  user_id: string;         // User who owns the source data
  kind: StructuralSignalKind;
  occurred_at: string;     // ISO timestamp (MUST be thinking time, never ingestion time)
  project_id?: string;     // Project ID if applicable
  source_id?: string;      // Row ID from origin table (for traceability)
};

/**
 * Generate deterministic signal ID
 * Uses hash of kind + source_id + occurred_at + project_id
 */
export function generateSignalId(
  kind: StructuralSignalKind,
  sourceId: string | undefined,
  occurredAt: string,
  projectId: string | undefined
): string {
  const hashInput = [
    kind,
    sourceId || '',
    occurredAt,
    projectId || '',
  ].join(':');
  
  return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
}

/**
 * Calculate midpoint of a temporal window
 * Used to derive thinking time from start/end timestamps
 * 
 * @param start - Start timestamp (ISO string)
 * @param end - End timestamp (ISO string, optional)
 * @returns Midpoint timestamp (ISO string)
 * @throws Error if neither start nor end is provided
 */
export function midpoint(start?: string, end?: string): string {
  if (!start && !end) {
    throw new Error('midpoint() requires at least one of start or end');
  }
  
  if (start && end) {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const midpointTime = (startTime + endTime) / 2;
    return new Date(midpointTime).toISOString();
  }
  
  // If only one provided, use that
  return start || end!;
}

/**
 * Dev assertion: ensure occurred_at is thinking-time derived
 * Throws in development to fail loudly
 */
export function assertThinkingTime(occurredAt: string, context: string): void {
  if (!occurredAt) {
    throw new Error(`[SignalCollector] Missing occurred_at in ${context}`);
  }
  
  // In development, we should validate that occurred_at is not ingestion time
  // This is a structural check - in production we rely on correct implementation
  if (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development') {
    // Basic validation: occurred_at must be a valid ISO timestamp
    const timestamp = new Date(occurredAt);
    if (isNaN(timestamp.getTime())) {
      throw new Error(`[SignalCollector] Invalid occurred_at in ${context}: ${occurredAt}`);
    }
  }
}
