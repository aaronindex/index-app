// lib/askStructuralAnswer.ts
// Structured ledger interpretation for Ask Index state queries.
// Builds multi-section answers (Interpretation / Supporting Signals / Structural Context / Next Attention)
// from decisions, tasks, arcs, and recent shifts.

import { getSupabaseServerClient } from '@/lib/supabaseServer';
import type { StateQueryResult } from './stateQuery';
import type { AskCategory } from './askRouter';

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
}): Promise<StructuralAnswerSections> {
  const { userId, scope, category, state, projectId } = params;
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
  // 2) Interpretation
  // ---------------------------------------------------------------------------
  const interpretationParts: string[] = [];

  if (!hasLedger) {
    interpretationParts.push(
      'No signals detected yet in this scope.'
    );
  } else {
    // Category-specific framing
    if (category === 'STRUCTURAL') {
      const themeFromDecisions =
        state.newDecisions[0]?.title?.trim() ||
        state.newOrChangedTasks[0]?.title?.trim() ||
        null;

      if (hasArcs) {
        const primaryArc = pickPrimaryArc(activeArcs);
        const theme = primaryArc || themeFromDecisions;
        if (theme) {
          interpretationParts.push(
            `Recent decisions indicate the project is currently focused on ${theme}.`
          );
        } else {
          interpretationParts.push(
            `The project is currently converging around a small set of related workstreams ${scope === 'project' ? 'in this project' : 'across your INDEX'}.`
          );
        }
      } else if (themeFromDecisions) {
        interpretationParts.push(
          `Recent decisions indicate the project is currently focused on ${themeFromDecisions}.`
        );
      } else {
        interpretationParts.push(
          `The project is currently focused on a small number of active workstreams ${scope === 'project' ? 'in this project' : 'across your INDEX'}.`
        );
      }
    } else if (category === 'DECISIONS') {
      if (hasDecisions) {
        interpretationParts.push(
          `${state.newDecisions.length} decision${state.newDecisions.length === 1 ? '' : 's'} were recorded in the last ${state.timeWindowDaysUsed} days ${scopeLabel}.`
        );
      } else {
        interpretationParts.push(`No new decisions were recorded in the last ${state.timeWindowDaysUsed} days ${scopeLabel}.`);
      }
    } else if (category === 'ATTENTION') {
      if (hasBlockers) {
        const blockedCount = state.blockersOrStale.filter((b) => b.reason === 'blocked').length;
        const staleCount = state.blockersOrStale.filter((b) => b.reason === 'stale').length;
        interpretationParts.push(
          `There are ${blockedCount} blockers and ${staleCount} stale tasks that likely need attention ${scopeLabel}.`
        );
      } else if (hasTasks) {
        interpretationParts.push(
          `There are active tasks but no explicit blockers or stale items detected ${scopeLabel}.`
        );
      } else {
        interpretationParts.push(`No open tasks requiring attention were detected ${scopeLabel}.`);
      }
    } else if (category === 'EVOLUTION') {
      if (hasPulses) {
        interpretationParts.push(
          `Recent shifts in your structural ledger indicate motion ${scopeLabel}, including changes in arcs or structural momentum.`
        );
      } else {
        interpretationParts.push(
          `No structural shifts were recorded recently, but decisions and tasks still show how the work is evolving ${scopeLabel}.`
        );
      }
    }

    // Always mention decisions/tasks if present (after the primary directional sentence)
    if (hasDecisions || hasTasks) {
      const parts: string[] = [];
      if (hasDecisions) {
        parts.push(
          `${state.newDecisions.length} decision${state.newDecisions.length === 1 ? '' : 's'}`
        );
      }
      if (hasTasks) {
        parts.push(
          `${state.newOrChangedTasks.length} task${state.newOrChangedTasks.length === 1 ? '' : 's'} created or updated`
        );
      }
      interpretationParts.push(
        `${parts.join(' and ')} in the last ${state.timeWindowDaysUsed} days.`
      );
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
    supportingLines.length > 0 ? supportingLines.join('\n') : 'No recent decisions or tasks were found.';

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
    if (contextLines.length > 0) contextLines.push('');
    contextLines.push('Recent momentum:');

    // Summarize repeated shifts by human-readable label and count; cap to top 2.
    const shiftBuckets = new Map<
      string,
      { label: string; count: number }
    >();

    pulses.forEach((p) => {
      let humanLabel: string;
      switch (p.pulse_type) {
        case 'arc_shift':
          humanLabel = 'Direction shift forming';
          break;
        case 'structural_threshold':
          humanLabel = 'Structural momentum detected';
          break;
        case 'tension':
          humanLabel = 'New tension emerging';
          break;
        case 'result_recorded':
          humanLabel = 'Milestone recorded';
          break;
        default:
          humanLabel = 'Structural change';
      }
      const key = humanLabel;
      const bucket = shiftBuckets.get(key) || { label: humanLabel, count: 0 };
      bucket.count += 1;
      shiftBuckets.set(key, bucket);
    });

    const summarized = Array.from(shiftBuckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);

    summarized.forEach((s) => {
      const suffix = s.count > 1 ? ` (${s.count} signals)` : '';
      contextLines.push(`- ${s.label.split(' ')[0]}${suffix}`);
    });
  }

  const structuralContext =
    contextLines.length > 0 ? contextLines.join('\n') : 'No active arcs or recent shifts were found.';

  // ---------------------------------------------------------------------------
  // 5) Next Attention (optional)
  // ---------------------------------------------------------------------------
  let nextAttention: string | null = null;

  if (state.blockersOrStale.length > 0) {
    const items = state.blockersOrStale.slice(0, 3);
    const lines: string[] = [];
    lines.push('Consider focusing on:');
    items.forEach((item) => {
      const projectPrefix = item.project_name ? `${item.project_name} → ` : '';
      const reasonLabel = item.reason === 'blocked' ? 'Blocker' : 'Stale';
      lines.push(`- [${reasonLabel}] ${projectPrefix}${item.title}`);
    });
    nextAttention = lines.join('\n');
  } else if (state.newOrChangedTasks.length > 0 && category === 'ATTENTION') {
    const items = state.newOrChangedTasks.slice(0, 3);
    const lines: string[] = [];
    lines.push('Next attention candidates:');
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

