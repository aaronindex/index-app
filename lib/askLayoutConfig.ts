// lib/askLayoutConfig.ts
/**
 * Ask INDEX Phase 3: Layout adaptation by analysis mode.
 * Section order and optional label overrides. Reading first, Next Reads last.
 */

import type { AskIndexAnalysisMode } from './askAnalysisMode';

export type AskIndexSectionKey =
  | 'reading'
  | 'supportingSignals'
  | 'structuralContext'
  | 'nextAttention'
  | 'continueExploring';

export interface AskIndexLayoutConfig {
  sectionOrder: AskIndexSectionKey[];
  labels?: Partial<Record<AskIndexSectionKey, string>>;
}

const DEFAULT_LABELS: Record<AskIndexSectionKey, string> = {
  reading: 'Reading',
  supportingSignals: 'Supporting Signals',
  structuralContext: 'Structural Context',
  nextAttention: 'Next Attention',
  continueExploring: 'Next Reads',
};

export const ASK_INDEX_LAYOUTS: Record<AskIndexAnalysisMode, AskIndexLayoutConfig> = {
  direction: {
    sectionOrder: [
      'reading',
      'supportingSignals',
      'structuralContext',
      'nextAttention',
      'continueExploring',
    ],
  },
  change: {
    sectionOrder: [
      'reading',
      'structuralContext',
      'supportingSignals',
      'nextAttention',
      'continueExploring',
    ],
  },
  attention: {
    sectionOrder: [
      'reading',
      'nextAttention',
      'supportingSignals',
      'structuralContext',
      'continueExploring',
    ],
  },
  signals: {
    sectionOrder: [
      'reading',
      'supportingSignals',
      'structuralContext',
      'nextAttention',
      'continueExploring',
    ],
  },
  tension: {
    sectionOrder: [
      'reading',
      'structuralContext',
      'supportingSignals',
      'nextAttention',
      'continueExploring',
    ],
  },
};

/**
 * Get layout config for an analysis mode. Defaults to direction when mode is missing or unknown.
 */
export function getAskIndexLayoutConfig(
  analysisMode: AskIndexAnalysisMode | undefined | null
): AskIndexLayoutConfig {
  if (!analysisMode || !(analysisMode in ASK_INDEX_LAYOUTS)) {
    return ASK_INDEX_LAYOUTS.direction;
  }
  return ASK_INDEX_LAYOUTS[analysisMode];
}

/**
 * Get section title for display. Uses layout label override when present, else default.
 */
export function getSectionLabel(
  sectionKey: AskIndexSectionKey,
  config: AskIndexLayoutConfig
): string {
  return config.labels?.[sectionKey] ?? DEFAULT_LABELS[sectionKey];
}

const ASK_READING_EYEBROW: Record<AskIndexAnalysisMode, string> = {
  direction: 'CURRENT FOCUS',
  change: 'RECENT SHIFT',
  attention: 'NEXT ATTENTION',
  signals: 'SIGNALS IN VIEW',
  tension: 'ACTIVE TENSION',
};

export function getAskReadingEyebrow(analysisMode: AskIndexAnalysisMode | undefined | null): string {
  if (!analysisMode || !(analysisMode in ASK_READING_EYEBROW)) return ASK_READING_EYEBROW.direction;
  return ASK_READING_EYEBROW[analysisMode];
}
