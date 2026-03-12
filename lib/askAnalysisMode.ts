// lib/askAnalysisMode.ts
/**
 * Ask INDEX Phase 2: Question-Type Detection / Routed Analysis Mode.
 * Maps normalized query → analysis mode for downstream ledger analysis and layout.
 * Deterministic, no AI. INDEX is not a chat surface.
 */

import type { NormalizedAskIndexQuery } from './askNormalize';

export type AskIndexAnalysisMode =
  | 'direction'
  | 'change'
  | 'attention'
  | 'signals'
  | 'tension';

export interface AskIndexInterpretation {
  normalizedQuery: NormalizedAskIndexQuery;
  analysisMode: AskIndexAnalysisMode;
}

/**
 * Map normalized query to analysis mode.
 * Currently a direct 1:1 mapping; may diverge when routing becomes more sophisticated.
 */
export function getAnalysisMode(
  normalized: NormalizedAskIndexQuery
): AskIndexAnalysisMode {
  return normalized.canonicalType;
}

/**
 * Build interpretation for the Ask INDEX pipeline (normalized query + analysis mode).
 */
export function buildAskIndexInterpretation(
  normalizedQuery: NormalizedAskIndexQuery
): AskIndexInterpretation {
  return {
    normalizedQuery,
    analysisMode: getAnalysisMode(normalizedQuery),
  };
}
