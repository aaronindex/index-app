// lib/askFollowUps.ts
/**
 * Ask INDEX Follow-up Intelligence V2.
 * Deterministic structural navigation (Next Reads). No LLM. No chat.
 * Enforces operator diversity; never suggests the same canonical type as the current query.
 */

import type { AskIndexAnalysisMode } from './askAnalysisMode';
import type { CanonicalQueryType } from './askNormalize';

export type AskIndexFollowUpOperator =
  | 'drill_down'
  | 'reframe'
  | 'advance'
  | 'stress_test'
  | 'expand_scope';

export interface AskIndexFollowUp {
  label: string;
  nextQuery: string;
  operator: AskIndexFollowUpOperator;
  /** Canonical type this follow-up leads to (used to avoid repeating current query type). */
  canonicalType: CanonicalQueryType;
}

type ScopeForFollowUps = 'index' | 'project';

const MAX_FOLLOW_UPS = 4;
const MIN_FOLLOW_UPS = 3;
const PREFERRED_TYPE_ORDER: CanonicalQueryType[] = ['signals', 'attention', 'tension', 'direction', 'change'];

/**
 * Select up to MAX_FOLLOW_UPS items with operator diversity: at most one per operator.
 */
function selectWithOperatorDiversity(candidates: AskIndexFollowUp[]): AskIndexFollowUp[] {
  const seen = new Set<AskIndexFollowUpOperator>();
  const result: AskIndexFollowUp[] = [];
  for (const item of candidates) {
    if (result.length >= MAX_FOLLOW_UPS) break;
    if (seen.has(item.operator)) continue;
    seen.add(item.operator);
    result.push(item);
  }
  return result;
}

/**
 * Fallback follow-ups by canonical type (one per type) for filling to MIN_FOLLOW_UPS.
 */
const FALLBACK_BY_TYPE: Record<CanonicalQueryType, AskIndexFollowUp> = {
  signals: { label: 'What signals are driving that?', nextQuery: 'What signals support this?', operator: 'drill_down', canonicalType: 'signals' },
  attention: { label: 'What needs attention next?', nextQuery: 'What needs attention?', operator: 'advance', canonicalType: 'attention' },
  tension: { label: 'Where is the tension?', nextQuery: 'Where is the tension?', operator: 'stress_test', canonicalType: 'tension' },
  direction: { label: 'Where is this going?', nextQuery: 'Where is this going?', operator: 'reframe', canonicalType: 'direction' },
  change: { label: 'What changed recently?', nextQuery: 'What changed recently?', operator: 'reframe', canonicalType: 'change' },
};

/**
 * Fill result to MIN_FOLLOW_UPS using preferred type order, skipping current type and already-present types.
 */
function fillToMinimum(
  result: AskIndexFollowUp[],
  currentCanonicalType: CanonicalQueryType | undefined | null
): AskIndexFollowUp[] {
  if (result.length >= MIN_FOLLOW_UPS) return result;
  const typesInResult = new Set(result.map((f) => f.canonicalType));
  const out = [...result];
  for (const t of PREFERRED_TYPE_ORDER) {
    if (out.length >= MIN_FOLLOW_UPS) break;
    if (t === currentCanonicalType || typesInResult.has(t)) continue;
    typesInResult.add(t);
    out.push(FALLBACK_BY_TYPE[t]);
  }
  return out;
}

/**
 * Deterministic follow-ups by analysis mode and scope.
 * Removes follow-ups that match the current query's canonical type; fills to 3 if needed.
 */
export function getAskIndexFollowUps(
  analysisMode: AskIndexAnalysisMode | undefined | null,
  scope: ScopeForFollowUps,
  options?: { projectId?: string | null; currentCanonicalType?: CanonicalQueryType | null }
): AskIndexFollowUp[] {
  const currentType = options?.currentCanonicalType ?? null;
  const mode = analysisMode && analysisMode in FOLLOW_UP_SETS ? analysisMode : 'direction';
  const set = FOLLOW_UP_SETS[mode];
  const base = Array.isArray(set.base) ? set.base : set.base(scope, options);
  const scopeItem = set.scopeAware?.(scope, options);
  const combined = scopeItem ? [...base, scopeItem] : base;
  const filtered = currentType ? combined.filter((f) => f.canonicalType !== currentType) : combined;
  const withDiversity = selectWithOperatorDiversity(filtered);
  return fillToMinimum(withDiversity, currentType);
}

type FollowUpSet = {
  base: AskIndexFollowUp[] | ((scope: ScopeForFollowUps, options?: { projectId?: string | null }) => AskIndexFollowUp[]);
  scopeAware?: (scope: ScopeForFollowUps, options?: { projectId?: string | null }) => AskIndexFollowUp | null;
};

const FOLLOW_UP_SETS: Record<AskIndexAnalysisMode, FollowUpSet> = {
  direction: {
    base: [
      { label: 'Review supporting decisions', nextQuery: 'What decisions support this?', operator: 'drill_down', canonicalType: 'signals' },
      { label: 'Check recent shifts', nextQuery: 'What changed recently?', operator: 'reframe', canonicalType: 'change' },
      { label: 'See what needs attention', nextQuery: 'What needs attention?', operator: 'advance', canonicalType: 'attention' },
      { label: 'Check for structural tension', nextQuery: 'Where is the tension?', operator: 'stress_test', canonicalType: 'tension' },
    ],
  },
  change: {
    base: [
      { label: 'Review recent signals', nextQuery: 'What signals support this change?', operator: 'drill_down', canonicalType: 'signals' },
      { label: 'See emerging direction', nextQuery: 'Where is this going?', operator: 'reframe', canonicalType: 'direction' },
      { label: 'See what needs attention', nextQuery: 'What needs attention?', operator: 'advance', canonicalType: 'attention' },
    ],
    scopeAware(scope, options) {
      if (scope === 'project') {
        return { label: 'Expand across your INDEX', nextQuery: 'What changed across my INDEX?', operator: 'expand_scope', canonicalType: 'change' };
      }
      if (scope === 'index' && options?.projectId) {
        return { label: 'Narrow to this project', nextQuery: 'What changed in this project?', operator: 'expand_scope', canonicalType: 'change' };
      }
      return null;
    },
  },
  attention: {
    base: [
      { label: 'Review active tasks', nextQuery: 'What tasks support this?', operator: 'drill_down', canonicalType: 'signals' },
      { label: 'Check recent shifts', nextQuery: 'What changed recently?', operator: 'reframe', canonicalType: 'change' },
      { label: 'Check for unresolved tension', nextQuery: 'Where is the tension?', operator: 'stress_test', canonicalType: 'tension' },
      { label: 'See what direction this supports', nextQuery: 'Where is this going?', operator: 'advance', canonicalType: 'direction' },
    ],
  },
  signals: {
    base: [
      { label: 'Review supporting signals', nextQuery: 'What signals support this?', operator: 'drill_down', canonicalType: 'signals' },
      { label: 'See what this suggests', nextQuery: 'Where is this going?', operator: 'reframe', canonicalType: 'direction' },
      { label: 'See what needs attention', nextQuery: 'What needs attention?', operator: 'advance', canonicalType: 'attention' },
    ],
    scopeAware(scope) {
      if (scope === 'project') {
        return { label: 'Expand across your INDEX', nextQuery: 'What signals appear across my INDEX?', operator: 'expand_scope', canonicalType: 'signals' };
      }
      return null;
    },
  },
  tension: {
    base: [
      { label: 'Review conflicting signals', nextQuery: 'What signals show tension here?', operator: 'drill_down', canonicalType: 'tension' },
      { label: 'See what needs attention', nextQuery: 'What needs attention?', operator: 'advance', canonicalType: 'attention' },
      { label: 'See which direction is dominant', nextQuery: 'Where is this going?', operator: 'reframe', canonicalType: 'direction' },
    ],
  },
};
