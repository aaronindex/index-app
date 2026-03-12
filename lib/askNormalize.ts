// lib/askNormalize.ts
/**
 * Query normalization for Ask INDEX (Phase 1).
 * Maps user phrasings into canonical query types for routing.
 * Deterministic, keyword/phrase-based. No AI, no chat behavior.
 */

export type CanonicalQueryType =
  | 'direction'
  | 'change'
  | 'attention'
  | 'signals'
  | 'tension';

export type NormalizedTimeframe = 'recent' | 'all_time' | 'unspecified';
export type NormalizedScope = 'index' | 'project';

export interface NormalizedAskIndexQuery {
  rawQuestion: string;
  canonicalType: CanonicalQueryType;
  /** When not inferred from query, use the scope passed from the client (current Ask INDEX scope). */
  scope: NormalizedScope;
  timeframe: NormalizedTimeframe;
}

/** Phrases and keywords per canonical type, ordered by specificity (phrases first). */
const PATTERNS: Record<CanonicalQueryType, (string | RegExp)[]> = {
  change: [
    'what changed recently',
    "what's new",
    'any recent shifts',
    'what moved',
    'what feels different now',
    'what changed',
    'whats new',
    'recent shifts',
    'recently changed',
    'changed this week',
    'changed lately',
    'new this week',
    'lately',
    'recently',
    'what moved',
  ],
  direction: [
    'where is this going',
    'what direction is this heading',
    'what am i moving toward',
    'what is this becoming',
    'where are we heading',
    'what direction',
    'direction',
    'heading',
    'moving toward',
    'what is this becoming',
    'most active arc',
    'what arc',
    'which arc',
    'patterns emerging',
    'what patterns',
  ],
  attention: [
    'what needs attention',
    'where should i focus',
    'what should i work on',
    "what's most pressing",
    'what still needs attention',
    'what needs my attention',
    'where to focus',
    'needs attention',
    'should i focus',
    'should i work on',
    'most pressing',
    'blocking',
    'blockers',
    'blocked',
    'bottleneck',
    'open loops',
    'open loop',
    'unresolved',
    'stuck',
    'todo',
    'to do',
    'what to do next',
  ],
  signals: [
    'what decisions are here',
    'show me the tasks',
    'what signals exist',
    'what supports this reading',
    'what decisions',
    'show me decisions',
    'show me tasks',
    'what tasks',
    'what signals',
    'supports this',
    'decisions in',
    'tasks in',
    'list decisions',
    'list tasks',
  ],
  tension: [
    'where is the tension',
    'what feels conflicted',
    'what is unresolved',
    'what am i torn between',
    'where is tension',
    'feels conflicted',
    'torn between',
    'what is unresolved',
    'conflicted',
    'tension',
    'unresolved',
    'contradiction',
    'conflicting',
  ],
};

/** Scope: explicit index-wide phrasing → index. Explicit project → project. Else use currentScope. */
const SCOPE_INDEX_PHRASES = [
  'across my index',
  'across index',
  'across your index',
  'all projects',
  'everywhere',
  'whole index',
  'entire index',
  'globally',
];

const SCOPE_PROJECT_PHRASES = [
  'in this project',
  'this project',
  'for this project',
  'in the project',
];

/** Timeframe: recent hints. */
const TIMEFRAME_RECENT = [
  'recently',
  'lately',
  'this week',
  'this month',
  'new',
  'changed recently',
  'changed this week',
  'recent',
  'last week',
  'last month',
];

function matchesPatterns(text: string, patterns: (string | RegExp)[]): boolean {
  for (const p of patterns) {
    if (typeof p === 'string') {
      if (text.includes(p)) return true;
    } else {
      if (p.test(text)) return true;
    }
  }
  return false;
}

/**
 * Normalize an Ask INDEX question into a canonical query.
 * Use currentScope when the user does not specify scope (preserve active Ask INDEX scope).
 */
export function normalizeAskIndexQuery(
  rawQuestion: string,
  currentScope: NormalizedScope = 'index'
): NormalizedAskIndexQuery {
  const trimmed = rawQuestion.trim();
  const text = trimmed.toLowerCase().replace(/\s+/g, ' ');

  // --- Scope (preserve current if not specified) ---
  let scope: NormalizedScope = currentScope;
  if (SCOPE_INDEX_PHRASES.some((p) => text.includes(p))) scope = 'index';
  else if (SCOPE_PROJECT_PHRASES.some((p) => text.includes(p))) scope = 'project';

  // --- Timeframe (lightweight) ---
  let timeframe: NormalizedTimeframe = 'unspecified';
  if (TIMEFRAME_RECENT.some((p) => text.includes(p))) timeframe = 'recent';
  // all_time: only if we see explicit "ever", "all time", "history" etc. in a later iteration

  // --- Canonical type (ordered: tension → change → direction → attention → signals, then fallback) ---
  const order: CanonicalQueryType[] = ['tension', 'change', 'direction', 'attention', 'signals'];
  let canonicalType: CanonicalQueryType = 'signals'; // conservative fallback

  for (const type of order) {
    if (matchesPatterns(text, PATTERNS[type])) {
      canonicalType = type;
      break;
    }
  }

  return {
    rawQuestion: trimmed,
    canonicalType,
    scope,
    timeframe,
  };
}
