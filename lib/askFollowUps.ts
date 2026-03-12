// lib/askFollowUps.ts
/**
 * Ask INDEX Follow-up Intelligence V2.
 * Deterministic structural navigation (Next Reads). No LLM. No chat.
 * Enforces operator diversity: prefer 1 drill_down, 1 reframe, 1 advance, 1 stress_test or expand_scope.
 */

import type { AskIndexAnalysisMode } from './askAnalysisMode';

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
}

type ScopeForFollowUps = 'index' | 'project';

const MAX_FOLLOW_UPS = 4;

/**
 * Select up to MAX_FOLLOW_UPS items with operator diversity: at most one per operator.
 * First occurrence of each operator is kept; order preserved.
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
 * Deterministic follow-ups by analysis mode and scope.
 * Enforces operator diversity. 3–4 items max.
 */
export function getAskIndexFollowUps(
  analysisMode: AskIndexAnalysisMode | undefined | null,
  scope: ScopeForFollowUps,
  options?: { projectId?: string | null }
): AskIndexFollowUp[] {
  const mode = analysisMode && analysisMode in FOLLOW_UP_SETS ? analysisMode : 'direction';
  const set = FOLLOW_UP_SETS[mode];
  const base = Array.isArray(set.base) ? set.base : set.base(scope, options);
  const scopeItem = set.scopeAware?.(scope, options);
  const combined = scopeItem ? [...base, scopeItem] : base;
  return selectWithOperatorDiversity(combined);
}

type FollowUpSet = {
  base: AskIndexFollowUp[] | ((scope: ScopeForFollowUps, options?: { projectId?: string | null }) => AskIndexFollowUp[]);
  scopeAware?: (scope: ScopeForFollowUps, options?: { projectId?: string | null }) => AskIndexFollowUp | null;
};

const FOLLOW_UP_SETS: Record<AskIndexAnalysisMode, FollowUpSet> = {
  direction: {
    base: [
      { label: 'Review supporting decisions', nextQuery: 'What decisions support this?', operator: 'drill_down' },
      { label: 'Check recent shifts', nextQuery: 'What changed recently?', operator: 'reframe' },
      { label: 'See what needs attention', nextQuery: 'What needs attention?', operator: 'advance' },
      { label: 'Check for structural tension', nextQuery: 'Where is the tension?', operator: 'stress_test' },
    ],
  },
  change: {
    base: [
      { label: 'Review recent signals', nextQuery: 'What signals support this change?', operator: 'drill_down' },
      { label: 'See emerging direction', nextQuery: 'Where is this going?', operator: 'reframe' },
      { label: 'See what needs attention', nextQuery: 'What needs attention?', operator: 'advance' },
    ],
    scopeAware(scope, options) {
      if (scope === 'project') {
        return { label: 'Expand across your INDEX', nextQuery: 'What changed across my INDEX?', operator: 'expand_scope' };
      }
      if (scope === 'index' && options?.projectId) {
        return { label: 'Narrow to this project', nextQuery: 'What changed in this project?', operator: 'expand_scope' };
      }
      return null;
    },
  },
  attention: {
    base: [
      { label: 'Review active tasks', nextQuery: 'What tasks support this?', operator: 'drill_down' },
      { label: 'Check recent shifts', nextQuery: 'What changed recently?', operator: 'reframe' },
      { label: 'Check for unresolved tension', nextQuery: 'Where is the tension?', operator: 'stress_test' },
      { label: 'See what direction this supports', nextQuery: 'Where is this going?', operator: 'advance' },
    ],
  },
  signals: {
    base: [
      { label: 'Review supporting signals', nextQuery: 'What signals support this?', operator: 'drill_down' },
      { label: 'See what this suggests', nextQuery: 'Where is this going?', operator: 'reframe' },
      { label: 'See what needs attention', nextQuery: 'What needs attention?', operator: 'advance' },
    ],
    scopeAware(scope) {
      if (scope === 'project') {
        return { label: 'Expand across your INDEX', nextQuery: 'What signals appear across my INDEX?', operator: 'expand_scope' };
      }
      return null;
    },
  },
  tension: {
    base: [
      { label: 'Review conflicting signals', nextQuery: 'What signals show tension here?', operator: 'drill_down' },
      { label: 'See what needs attention', nextQuery: 'What needs attention?', operator: 'advance' },
      { label: 'See which direction is dominant', nextQuery: 'Where is this going?', operator: 'reframe' },
    ],
  },
};
