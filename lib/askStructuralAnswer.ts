// lib/askStructuralAnswer.ts
// Structured ledger interpretation for Ask Index state queries.
// Uses canonical ontology: Signal, Arc, Direction, Tension, Attention, Momentum, Shift.
// Interpretations describe structure (1–2 sentences); no redundant scope, no user-inference.

import { getSupabaseServerClient } from '@/lib/supabaseServer';
import type { StateQueryResult } from './stateQuery';
import type { AskCategory } from './askRouter';
import type { AskIndexAnalysisMode } from './askAnalysisMode';

type Scope = 'project' | 'global';

type PulseRow = {
  id: string;
  pulse_type: string;
  headline: string | null;
  occurred_at: string;
};

type ArcRow = {
  id: string;
  summary: string | null;
  last_signal_at: string | null;
};

export interface StructuralAnswerSections {
  interpretation: string;
  supportingSignals: string;
  structuralContext: string;
  nextAttention: string | null;
  /** True when any ledger evidence (decisions, tasks, arcs, shifts) was available. */
  hasLedger: boolean;
}

export async function buildStructuralAnswer(params: {
  userId: string;
  scope: Scope;
  category: AskCategory;
  state: StateQueryResult;
  projectId?: string | null;
  /** Optional analysis mode for tension-aware and structural-pressure phrasing. */
  analysisMode?: AskIndexAnalysisMode | null;
}): Promise<StructuralAnswerSections> {
  const { userId, scope, category, state, projectId, analysisMode } = params;
  const supabase = await getSupabaseServerClient();

  // ---------------------------------------------------------------------------
  // 1) Load structural context: latest snapshot → active arcs + recent shifts
  // ---------------------------------------------------------------------------
  let activeArcs: ArcRow[] = [];
  let pulses: PulseRow[] = [];

  // Latest snapshot for scope
  let snapshotQuery = supabase
    .from('snapshot_state')
    .select('state_hash, state_payload, generated_at, project_id')
    .eq('user_id', userId)
    .eq('scope', scope)
    .order('generated_at', { ascending: false })
    .limit(1);

  if (scope === 'project' && projectId) {
    snapshotQuery = snapshotQuery.eq('project_id', projectId);
  }

  const { data: snapshotRows } = await snapshotQuery;
  const latestSnapshot = snapshotRows?.[0] as
    | { state_hash?: string; state_payload?: { active_arc_ids?: string[] } | null }
    | undefined;

  const activeArcIds: string[] = Array.isArray(latestSnapshot?.state_payload?.active_arc_ids)
    ? (latestSnapshot!.state_payload!.active_arc_ids as string[])
    : [];

  if (activeArcIds.length > 0) {
    const { data: arcRows } = await supabase
      .from('arc')
      .select('id, summary, last_signal_at')
      .eq('user_id', userId)
      .in('id', activeArcIds);
    activeArcs = (arcRows ?? []) as ArcRow[];
  }

  // Recent shifts (global scope only; evolution across the whole INDEX)
  if (scope === 'global') {
    const { data: pulseRows } = await supabase
      .from('pulse')
      .select('id, pulse_type, headline, occurred_at')
      .eq('user_id', userId)
      .eq('scope', 'global')
      .in('pulse_type', ['arc_shift', 'structural_threshold', 'tension', 'result_recorded'])
      .order('occurred_at', { ascending: false })
      .limit(7);
    pulses = (pulseRows ?? []) as PulseRow[];
  }

  const hasDecisions = state.newDecisions.length > 0;
  const hasTasks = state.newOrChangedTasks.length > 0;
  const hasBlockers = state.blockersOrStale.length > 0;
  const hasArcs = activeArcs.length > 0;
  const hasPulses = pulses.length > 0;

  const hasLedger = hasDecisions || hasTasks || hasBlockers || hasArcs || hasPulses;

  // ---------------------------------------------------------------------------
  // 2) Interpretation (canonical ontology: Signal, Arc, Direction, Tension, Attention, Momentum, Shift)
  // ---------------------------------------------------------------------------
  const interpretationParts: string[] = [];

  if (!hasLedger) {
    interpretationParts.push('No signals detected yet.');
  } else if (analysisMode === 'tension') {
    if (hasPulses) {
      interpretationParts.push('Recent signals suggest a shift; no strong tension is clearly surfaced in the ledger.');
    } else {
      interpretationParts.push('Signals are relatively aligned, with no major unresolved pull between directions.');
    }
  } else {
    if (category === 'STRUCTURAL') {
      const themeFromDecisions =
        state.newDecisions[0]?.title?.trim() ||
        state.newOrChangedTasks[0]?.title?.trim() ||
        null;
      const primaryArc = hasArcs ? pickPrimaryArc(activeArcs) : null;
      const theme = primaryArc || themeFromDecisions;
      if (theme) {
        interpretationParts.push(`Signals are converging around ${theme}. The current arc suggests movement toward this direction.`);
      } else if (themeFromDecisions) {
        interpretationParts.push(`Recent decisions reinforce a direction toward ${themeFromDecisions}.`);
      } else {
        interpretationParts.push('Signals indicate a small set of active arcs; direction will clarify as more signals accumulate.');
      }
    } else if (category === 'DECISIONS') {
      if (hasDecisions) {
        interpretationParts.push('Recent signals suggest the current direction is being shaped by these decisions.');
      } else {
        interpretationParts.push(`No new decision signals in the last ${state.timeWindowDaysUsed} days.`);
      }
    } else if (category === 'ATTENTION') {
      if (hasBlockers) {
        const blockedCount = state.blockersOrStale.filter((b) => b.reason === 'blocked').length;
        const staleCount = state.blockersOrStale.filter((b) => b.reason === 'stale').length;
        interpretationParts.push(`Attention is concentrated around ${blockedCount} blocked and ${staleCount} stalled signals; momentum is asking for focus there.`);
      } else if (hasTasks) {
        const primaryArc = hasArcs ? pickPrimaryArc(activeArcs) : null;
        if (primaryArc) {
          interpretationParts.push(`Attention is currently centered on moving ${primaryArc} forward.`);
        } else {
          interpretationParts.push('Attention is gathering around a small set of active tasks.');
        }
      } else {
        interpretationParts.push('No task-level attention is clearly surfaced; the structure appears more directional than task-driven.');
      }
    } else if (category === 'EVOLUTION') {
      if (hasPulses) {
        interpretationParts.push(`Recent signals indicate a shift; momentum has moved in the arcs.`);
      } else {
        interpretationParts.push('No recent shift in signal patterns; decisions and tasks still show how the work is evolving.');
      }
    }
  }

  const interpretation = interpretationParts.join(' ');

  // ---------------------------------------------------------------------------
  // 3) Supporting Signals
  // ---------------------------------------------------------------------------
  const supportingLines: string[] = [];

  // For direction-style (STRUCTURAL) queries, prioritize decisions as supporting signals.
  // Tasks and blockers primarily live in Next Attention for that category.
  if (state.newDecisions.length > 0) {
    supportingLines.push('Decisions:');
    state.newDecisions.slice(0, 5).forEach((d) => {
      const projectPrefix = d.project_name ? `${d.project_name} → ` : '';
      supportingLines.push(`- ${projectPrefix}${d.title}`);
    });
  }

  if (category !== 'STRUCTURAL') {
    if (state.newOrChangedTasks.length > 0) {
      supportingLines.push(
        supportingLines.length > 0 ? '\nTasks:' : 'Tasks:'
      );
      state.newOrChangedTasks.slice(0, 5).forEach((t) => {
        const projectPrefix = t.project_name ? `${t.project_name} → ` : '';
        supportingLines.push(`- [${t.status}] ${projectPrefix}${t.title}`);
      });
    }

    if (state.blockersOrStale.length > 0) {
      supportingLines.push(
        supportingLines.length > 0 ? '\nBlockers / Stale:' : 'Blockers / Stale:'
      );
      state.blockersOrStale.slice(0, 5).forEach((b) => {
        const projectPrefix = b.project_name ? `${b.project_name} → ` : '';
        const reasonLabel = b.reason === 'blocked' ? 'Blocker' : 'Stale';
        supportingLines.push(`- [${reasonLabel}] ${projectPrefix}${b.title}`);
      });
    }
  }

  const supportingSignals =
    supportingLines.length > 0 ? supportingLines.join('\n') : 'No recent decision or task signals.';

  // ---------------------------------------------------------------------------
  // 4) Structural Context (arcs + shifts)
  // ---------------------------------------------------------------------------
  const contextLines: string[] = [];

  if (activeArcs.length > 0) {
    const primaryArc = pickPrimaryArc(activeArcs);
    const fallbackTheme =
      primaryArc ||
      state.newDecisions[0]?.title?.trim() ||
      state.newOrChangedTasks[0]?.title?.trim() ||
      'Active workstream';

    const extraCount = activeArcs.length - 1;
    const suffix = extraCount > 0 ? ` (+${extraCount} other${extraCount > 1 ? 's' : ''})` : '';
    contextLines.push(`Active arc: ${fallbackTheme}${suffix}`);
  }

  if (pulses.length > 0) {
    // Single compact line: "Recent momentum: Structural (7 signals)"
    const primaryType = pulses[0]?.pulse_type;
    let momentumLabel = 'Structural';
    if (primaryType === 'arc_shift') momentumLabel = 'Direction shift';
    else if (primaryType === 'structural_threshold') momentumLabel = 'Structural';
    else if (primaryType === 'tension') momentumLabel = 'Tension';
    else if (primaryType === 'result_recorded') momentumLabel = 'Milestone';
    contextLines.push(`Recent momentum: ${momentumLabel} (${pulses.length} signals)`);
  }

  const structuralContext =
    contextLines.length > 0 ? contextLines.join('\n') : 'No active arcs or recent signal momentum.';

  // ---------------------------------------------------------------------------
  // 5) Next Attention (optional)
  // ---------------------------------------------------------------------------
  let nextAttention: string | null = null;

  if (state.blockersOrStale.length > 0) {
    const items = state.blockersOrStale.slice(0, 3);
    const lines: string[] = [];
    lines.push('Attention gathering around:');
    items.forEach((item) => {
      const projectPrefix = item.project_name ? `${item.project_name} → ` : '';
      const reasonLabel = item.reason === 'blocked' ? 'Blocker' : 'Stale';
      lines.push(`- [${reasonLabel}] ${projectPrefix}${item.title}`);
    });
    nextAttention = lines.join('\n');
  } else if (state.newOrChangedTasks.length > 0 && category === 'ATTENTION') {
    const items = state.newOrChangedTasks.slice(0, 3);
    const lines: string[] = [];
    lines.push('Several active tasks concentrate attention around:');
    items.forEach((item) => {
      const projectPrefix = item.project_name ? `${item.project_name} → ` : '';
      lines.push(`- ${projectPrefix}${item.title}`);
    });
    nextAttention = lines.join('\n');
  }

  return {
    interpretation,
    supportingSignals,
    structuralContext,
    nextAttention,
    hasLedger,
  };
}

function pickPrimaryArc(arcs: ArcRow[]): string | null {
  if (arcs.length === 0) return null;
  const withTimes = arcs.map((arc) => ({
    arc,
    ts: arc.last_signal_at ? new Date(arc.last_signal_at).getTime() : 0,
  }));
  withTimes.sort((a, b) => b.ts - a.ts);
  const primary = withTimes[0]?.arc ?? arcs[0];
  const title = primary.summary?.trim();
  return title && title.length > 0 ? title : null;
}

