// lib/ui-data/project.load.ts
// Load structural state data for project view
// Read-only, no inference

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectStructuralSignals } from '../structure/signals';
import type { StructuralSignal } from '../structure/signals';
import type { StructuralStatePayload } from '@/lib/structure/hash';
import { getSemanticOverlay } from '@/lib/semantic-overlay/get-overlay';
import { detectTensionFromText } from '@/lib/tensionHeuristic';

export type ProjectViewData = {
  project: {
    id: string;
    name: string | null;
    thinking_started_at: string | null;
  } | null;
  latestSnapshotPayload: StructuralStatePayload | null;
  prevSnapshotPayload: StructuralStatePayload | null;
  snapshotText: string | null;
  snapshotGeneratedAt: string | null;
  projectSnapshots: Array<{
    id: string;
    generated_at: string | null;
    snapshot_text: string | null;
    state_payload: StructuralStatePayload | null;
    hasOutcome: boolean;
    latestOutcomeText: string | null;
  }>;
  latestSnapshotOutcomeText: string | null;
  activeArcs: Array<{
    id: string;
    title: string | null;
    status: string | null;
    contributingSignals?: Array<{ id: string; kind: string; label: string }>;
  }>;
  /** Lightweight tension detection: competing directions when 2+ arcs (v1 heuristic). */
  tensions: Array<{ left: string; right: string }>;
  timelineEvents: Array<{
    kind: 'decision' | 'result';
    occurred_at: string;
    project_id: string;
  }>;
  /** Events for project timeline: pulses + outcomes, with labels (semantic or fallback) */
  projectTimelineEvents: Array<{
    id: string;
    occurred_at: string;
    kind: 'pulse' | 'result';
    label: string;
  }>;
};

function isDevEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
  );
}

/**
 * Load project view structural data.
 *
 * - latestSnapshotPayload / prevSnapshotPayload: derived from snapshot_state (scope='project')
 * - timelineEvents: derived from structural signals (filter by project_id, kind in ("decision","result"))
 */
export async function loadProjectView(params: {
  supabaseClient: SupabaseClient;
  user_id: string;
  project_id: string;
}): Promise<ProjectViewData> {
  const { supabaseClient, user_id, project_id } = params;

  // Load project
  const { data: project } = await supabaseClient
    .from('projects')
    .select('id, name, thinking_started_at')
    .eq('id', project_id)
    .eq('user_id', user_id)
    .maybeSingle();

  // Load project-scoped snapshot history (capped) including editorial text + timestamps
  const { data: snapshots } = await supabaseClient
    .from('snapshot_state')
    .select('id, state_hash, state_payload, snapshot_text, generated_at, project_id')
    .eq('user_id', user_id)
    .eq('scope', 'project')
    .eq('project_id', project_id)
    // Newest first; we'll derive chronological order in code below.
    .order('generated_at', { ascending: false })
    .limit(50);

  const snapshotRows = snapshots ?? [];

  // Fetch recent project outcomes (newest first, capped)
  const { data: outcomes } = await supabaseClient
    .from('project_outcome')
    .select('id, text, occurred_at, created_at, project_id')
    .eq('user_id', user_id)
    .eq('project_id', project_id)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const outcomeRows = outcomes ?? [];

  // Prepare snapshot timeline metadata: assign outcomes to snapshot intervals.
  type SnapshotMeta = {
    id: string;
    generated_at: string | null;
    state_hash: string | null;
    snapshot_text: string | null;
    state_payload: StructuralStatePayload | null;
  };

  const snapshotsChrono = [...snapshotRows]
    .map((row: any) => {
      const generated_at = (row.generated_at as string | null) ?? null;
      if (!generated_at) return null;
      const ts = new Date(generated_at).getTime();
      if (Number.isNaN(ts)) return null;
      return {
        id: row.id as string,
        generated_at,
        state_hash: (row.state_hash as string | null) ?? null,
        snapshot_text: (row.snapshot_text as string | null) ?? null,
        state_payload: (row.state_payload as StructuralStatePayload | null) ?? null,
        ts,
      } as SnapshotMeta & { ts: number };
    })
    .filter((row): row is SnapshotMeta & { ts: number } => !!row)
    .sort((a, b) => a.ts - b.ts); // oldest → newest

  type OutcomeMeta = {
    id: string;
    text: string;
    occurred_at: string;
    ts: number;
  };

  const outcomesChrono: OutcomeMeta[] = [...outcomeRows]
    .map((row: any) => {
      const occurred_at = (row.occurred_at as string | null) ?? (row.created_at as string | null) ?? null;
      if (!occurred_at) return null;
      const ts = new Date(occurred_at).getTime();
      if (Number.isNaN(ts)) return null;
      return {
        id: row.id as string,
        text: String(row.text ?? '').trim(),
        occurred_at,
        ts,
      };
    })
    .filter((row): row is OutcomeMeta => !!row && !!row.text)
    .sort((a, b) => a.ts - b.ts); // oldest → newest

  // Assign outcomes to snapshot intervals (prev, current] in chronological order.
  type SnapshotIntervalMeta = {
    hasOutcome: boolean;
    latestOutcomeText: string | null;
  };
  const snapshotIntervalMeta = new Map<string, SnapshotIntervalMeta>();

  let outcomeIndex = 0;
  let prevTs = Number.NEGATIVE_INFINITY;

  for (const snap of snapshotsChrono) {
    const upperTs = snap.ts;
    const intervalOutcomes: OutcomeMeta[] = [];

    while (outcomeIndex < outcomesChrono.length && outcomesChrono[outcomeIndex]!.ts <= upperTs) {
      const candidate = outcomesChrono[outcomeIndex]!;
      if (candidate.ts > prevTs) {
        intervalOutcomes.push(candidate);
      }
      outcomeIndex += 1;
    }

    if (intervalOutcomes.length > 0) {
      const latest = intervalOutcomes[intervalOutcomes.length - 1]!;
      snapshotIntervalMeta.set(snap.id, {
        hasOutcome: true,
        latestOutcomeText: latest.text,
      });
    } else {
      snapshotIntervalMeta.set(snap.id, {
        hasOutcome: false,
        latestOutcomeText: null,
      });
    }

    prevTs = upperTs;
  }

  // Dedupe consecutive snapshots with identical state_hash for timeline purposes.
  type TimelineSnapshot = SnapshotMeta & SnapshotIntervalMeta & { ts: number };

  const dedupedTimelineSnapshots: TimelineSnapshot[] = [];
  let currentGroup: TimelineSnapshot[] = [];

  for (const snap of snapshotsChrono) {
    const interval = snapshotIntervalMeta.get(snap.id) ?? {
      hasOutcome: false,
      latestOutcomeText: null,
    };
    const enriched: TimelineSnapshot = {
      id: snap.id,
      generated_at: snap.generated_at,
      state_hash: snap.state_hash,
      snapshot_text: snap.snapshot_text,
      state_payload: snap.state_payload,
      hasOutcome: interval.hasOutcome,
      latestOutcomeText: interval.latestOutcomeText,
      ts: snap.ts,
    };

    if (currentGroup.length === 0) {
      currentGroup.push(enriched);
      continue;
    }

    const lastInGroup = currentGroup[currentGroup.length - 1]!;
    if (lastInGroup.state_hash && enriched.state_hash && lastInGroup.state_hash === enriched.state_hash) {
      currentGroup.push(enriched);
    } else {
      // Finalize previous group: keep newest (last), merge outcome flags/text.
      const groupNewest = currentGroup[currentGroup.length - 1]!;
      const groupHasOutcome = currentGroup.some((s) => s.hasOutcome);
      const groupLatestOutcomeText =
        [...currentGroup]
          .filter((s) => s.hasOutcome && s.latestOutcomeText)
          .map((s) => s.latestOutcomeText as string)
          .pop() ?? null;

      dedupedTimelineSnapshots.push({
        ...groupNewest,
        hasOutcome: groupHasOutcome,
        latestOutcomeText: groupLatestOutcomeText,
      });

      currentGroup = [enriched];
    }
  }

  if (currentGroup.length > 0) {
    const groupNewest = currentGroup[currentGroup.length - 1]!;
    const groupHasOutcome = currentGroup.some((s) => s.hasOutcome);
    const groupLatestOutcomeText =
      [...currentGroup]
        .filter((s) => s.hasOutcome && s.latestOutcomeText)
        .map((s) => s.latestOutcomeText as string)
        .pop() ?? null;

    dedupedTimelineSnapshots.push({
      ...groupNewest,
      hasOutcome: groupHasOutcome,
      latestOutcomeText: groupLatestOutcomeText,
    });
  }

  // Snapshot history for UI (horizontal timeline, newest last for left-to-right)
  const projectSnapshots = dedupedTimelineSnapshots
    .slice()
    .sort((a, b) => a.ts - b.ts)
    .map((snap) => ({
      id: snap.id,
      generated_at: snap.generated_at,
      snapshot_text: snap.snapshot_text,
      state_payload: snap.state_payload,
      hasOutcome: snap.hasOutcome,
      latestOutcomeText: snap.latestOutcomeText,
    }));

  // Latest / previous payloads for existing consumers (derive from full history, newest first)
  const latestSnapshotRow =
    snapshotRows && snapshotRows.length > 0 ? snapshotRows[0] : null;
  const latestSnapshotPayload: StructuralStatePayload | null =
    latestSnapshotRow && latestSnapshotRow.state_payload
      ? (latestSnapshotRow.state_payload as StructuralStatePayload)
      : null;

  const prevSnapshotPayload: StructuralStatePayload | null =
    snapshots && snapshots.length > 1 && snapshots[snapshots.length - 2]?.state_payload
      ? (snapshots[snapshots.length - 2].state_payload as StructuralStatePayload)
      : null;

  const snapshotGeneratedAt: string | null =
    latestSnapshotRow && 'generated_at' in latestSnapshotRow
      ? ((latestSnapshotRow as { generated_at?: string | null }).generated_at ?? null)
      : null;

  const snapshotText: string | null =
    latestSnapshotRow && 'snapshot_text' in latestSnapshotRow
      ? ((latestSnapshotRow as { snapshot_text: string | null }).snapshot_text ?? null)
      : null;

  // Latest outcome text for the latest snapshot interval (if any)
  let latestSnapshotOutcomeText: string | null = null;
  if (projectSnapshots.length > 0) {
    const latestTimelineSnapshot = projectSnapshots[projectSnapshots.length - 1]!;
    latestSnapshotOutcomeText = latestTimelineSnapshot.latestOutcomeText ?? null;
  }

  // Resolve active arcs for this project from snapshot payload + arc tables (read-only)
  let activeArcs: Array<{
    id: string;
    title: string | null;
    status: string | null;
    contributingSignals?: Array<{ id: string; kind: string; label: string }>;
  }> = [];
  const activeArcIds = latestSnapshotPayload?.active_arc_ids ?? [];
  if (activeArcIds.length > 0) {
    const { data: arcLinks } = await supabaseClient
      .from('arc_project_link')
      .select('arc_id')
      .eq('project_id', project_id)
      .in('arc_id', activeArcIds);

    const linkedArcIds =
      arcLinks?.map((row: { arc_id: string }) => row.arc_id).filter((id) => activeArcIds.includes(id)) ?? [];

    if (linkedArcIds.length > 0) {
      const { data: arcs } = await supabaseClient
        .from('arc')
        .select('id, summary, status')
        .eq('user_id', user_id)
        .in('id', linkedArcIds);

      const arcStatuses = latestSnapshotPayload?.arc_statuses ?? {};
      activeArcs =
        arcs?.map((arc: { id: string; summary: string | null; status: string | null }) => ({
          id: arc.id,
          title: arc.summary,
          status: arcStatuses[arc.id] ?? arc.status ?? null,
        })) ?? [];
    }
  }

  // Semantic overlay: replace arc titles when present (keyed by state_hash; does not alter state)
  const latestStateHash = (latestSnapshotRow as { state_hash?: string | null } | null)?.state_hash ?? null;
  if (latestStateHash && activeArcs.length > 0) {
    const overlay = await getSemanticOverlay({
      supabaseClient,
      user_id,
      scope_type: 'project',
      scope_id: project_id,
      state_hash: latestStateHash,
      arc_ids: activeArcs.map((a) => a.id),
    });
    if (Object.keys(overlay.arcTitles).length > 0) {
      activeArcs = activeArcs.map((arc) => ({
        ...arc,
        title: overlay.arcTitles[arc.id] ?? arc.title,
      }));
    }
  }

  // Tension detection v1.1: (1) 2+ arcs → competing directions; (2) text heuristic → explicit fork/tradeoff
  const tensions: Array<{ left: string; right: string }> = [];
  if (activeArcs.length >= 2) {
    const a = activeArcs[0];
    const b = activeArcs[1];
    const left = (a?.title ?? null)?.trim() || 'Direction A';
    const right = (b?.title ?? null)?.trim() || 'Direction B';
    tensions.push({ left, right });
  }

  // v1.1: single-source competing-option language (snapshot + project decisions)
  const textParts: string[] = [];
  if (snapshotText?.trim()) textParts.push(snapshotText.trim());
  const { data: projectDecisions } = await supabaseClient
    .from('decisions')
    .select('title, content')
    .eq('user_id', user_id)
    .eq('project_id', project_id)
    .limit(30);
  for (const d of projectDecisions ?? []) {
    const t = (d.title ?? '').trim();
    const c = (d.content ?? '').trim();
    if (t) textParts.push(t);
    if (c) textParts.push(c);
  }
  const combinedText = textParts.join('\n\n');
  const textTension = detectTensionFromText(combinedText);
  if (textTension) {
    const same = tensions.some(
      (t) =>
        t.left === textTension.left && t.right === textTension.right
    );
    if (!same) tensions.push(textTension);
  }

  // Project timeline: pulses (for this project) + outcomes as events with labels
  const PULSE_TYPES_PROJECT = ['arc_shift', 'structural_threshold', 'tension', 'result_recorded'] as const;
  /** Short fallback when no semantic/editorial content; avoid duplicating tooltip type line. */
  function pulseTypeFallback(pt: string): string {
    switch (pt) {
      case 'arc_shift':
      case 'structural_threshold':
        return 'A shift in focus';
      case 'tension':
        return 'A tension in focus';
      case 'result_recorded':
        return 'Result recorded';
      default:
        return 'Update to your structure';
    }
  }
  const GENERIC_FALLBACKS = new Set([
    'result recorded',
    'structural shift detected',
    'structural shift',
    'tension emerging',
    'structure updated',
    'a shift in focus',
    'a tension in focus',
    'update to your structure',
  ]);

  let projectTimelineEvents: Array<{ id: string; occurred_at: string; kind: 'pulse' | 'result'; label: string }> = [];

  // Include pulses for this project (project_id = project_id) OR global unattributed pulses (project_id is null).
  // Minimal pulses (arc_shift, structural_threshold) are created without project_id, so they only appear when we include null.
  const { data: projectPulses } = await supabaseClient
    .from('pulse')
    .select('id, pulse_type, headline, occurred_at, state_hash')
    .eq('user_id', user_id)
    .eq('scope', 'global')
    .or(`project_id.eq.${project_id},project_id.is.null`)
    .in('pulse_type', [...PULSE_TYPES_PROJECT])
    .order('occurred_at', { ascending: false })
    .limit(50);

  const pulseOverlay =
    projectPulses && projectPulses.length > 0 && latestStateHash
      ? await getSemanticOverlay({
          supabaseClient,
          user_id,
          scope_type: 'global',
          scope_id: null,
          state_hash: latestStateHash,
          pulse_id_state_hash_pairs: projectPulses.map((p: { id: string; state_hash: string }) => ({
            pulse_id: p.id,
            state_hash: p.state_hash,
          })),
        })
      : { pulseHeadlines: {} as Record<string, string> };

  // Load project conversations and decisions (newest first) for timeline tooltip priority: source title, decision title.
  type ConvRow = { id: string; title: string | null; started_at: string | null };
  type DecisionRow = { id: string; title: string | null; created_at: string | null };
  let projectConvsByTime: ConvRow[] = [];
  let projectDecisionsByTime: DecisionRow[] = [];
  try {
    const { data: pcRows } = await supabaseClient
      .from('project_conversations')
      .select('conversation_id')
      .eq('project_id', project_id);
    const convIds = (pcRows ?? []).map((r: { conversation_id: string }) => r.conversation_id);
    if (convIds.length > 0) {
      const { data: convRows } = await supabaseClient
        .from('conversations')
        .select('id, title, started_at')
        .eq('user_id', user_id)
        .in('id', convIds)
        .order('started_at', { ascending: false });
      projectConvsByTime = (convRows ?? []) as ConvRow[];
    }
    const { data: decisionRows } = await supabaseClient
      .from('decisions')
      .select('id, title, created_at')
      .eq('project_id', project_id)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    projectDecisionsByTime = (decisionRows ?? []) as DecisionRow[];
  } catch {
    // Non-fatal: timeline falls back to signal/arc/generic.
  }

  // Resolve arc title per pulse state_hash for fallback in tooltip priority.
  const arcTitleByStateHash: Record<string, string> = {};
  try {
    const distinctStateHashes = [...new Set((projectPulses ?? []).map((p: { state_hash?: string }) => p.state_hash).filter(Boolean))] as string[];
    if (distinctStateHashes.length > 0) {
      const { data: globalSnapshots } = await supabaseClient
        .from('snapshot_state')
        .select('state_hash, state_payload')
        .eq('user_id', user_id)
        .eq('scope', 'global')
        .in('state_hash', distinctStateHashes);
      const stateHashToArcIds: Record<string, string[]> = {};
      for (const row of globalSnapshots ?? []) {
        const r = row as { state_hash: string; state_payload?: { active_arc_ids?: string[] } | null };
        const ids = Array.isArray(r.state_payload?.active_arc_ids) ? r.state_payload.active_arc_ids : [];
        if (ids.length > 0) stateHashToArcIds[r.state_hash] = ids;
      }
      const firstArcIds = [...new Set(Object.values(stateHashToArcIds).map((ids) => ids[0]).filter(Boolean))] as string[];
      if (firstArcIds.length > 0) {
        const { data: arcRows } = await supabaseClient
          .from('arc')
          .select('id, summary')
          .eq('user_id', user_id)
          .in('id', firstArcIds);
        const arcIdToSummary = new Map(
          (arcRows ?? []).map((row: { id: string; summary: string | null }) => [row.id, (row.summary ?? '').trim()])
        );
        const { data: semanticRows } = await supabaseClient
          .from('semantic_labels')
          .select('object_id, title')
          .eq('user_id', user_id)
          .eq('scope_type', 'global')
          .is('scope_id', null)
          .eq('object_type', 'arc')
          .in('object_id', firstArcIds)
          .order('generated_at', { ascending: false });
        const arcIdToSemanticTitle = new Map<string, string>();
        for (const row of semanticRows ?? []) {
          const r = row as { object_id: string; title: string | null };
          if (r.title?.trim() && !arcIdToSemanticTitle.has(r.object_id)) {
            arcIdToSemanticTitle.set(r.object_id, r.title.trim());
          }
        }
        for (const [h, ids] of Object.entries(stateHashToArcIds)) {
          const arcId = ids[0];
          const title = arcId ? (arcIdToSemanticTitle.get(arcId) || arcIdToSummary.get(arcId)) : '';
          if (title) arcTitleByStateHash[h] = title;
        }
      }
    }
  } catch {
    // Non-fatal: project timeline falls back to semantic/snapshot/generic labels.
  }

  function isSystemPhrase(s: string): boolean {
    const lower = s.toLowerCase().trim();
    if (lower.length < 10) return false;
    if (/\b(threshold|momentum increased|structural threshold|in project)\b/.test(lower)) return true;
    if (/^(result recorded|structural shift|structural shift detected|arc shift|tension emerging|structure updated)(\s|$)/i.test(lower)) return true;
    return false;
  }
  const TOOLTIP_PHRASE_MAX_LEN = 80;
  function readablePhrase(s: string | null | undefined, maxLen: number = TOOLTIP_PHRASE_MAX_LEN): string {
    const t = (s ?? '').trim();
    if (!t) return '';
    const clause = t.match(/^[^.!?]+/)?.[0]?.trim() ?? t;
    const out = clause.length <= maxLen
      ? clause
      : clause.slice(0, maxLen).replace(/\s+\S*$/, '').trim();
    return out.length >= 8 ? out : '';
  }
  // Timeline tooltip label priority: 1) Source title, 2) Decision title, 3) Signal/highlight, 4) Arc title, 5) Generic.
  // Source/decision: latest conversation or decision in this project that occurred before the pulse time.
  const pulseEvents = (projectPulses ?? []).map((p: { id: string; pulse_type: string; headline: string | null; occurred_at: string; state_hash?: string }) => {
    const pulseTime = p.occurred_at;
    const sourceTitle =
      projectConvsByTime.find((c) => (c.started_at ?? '').localeCompare(pulseTime) <= 0)?.title?.trim() || '';
    const decisionTitle =
      projectDecisionsByTime.find((d) => (d.created_at ?? '').localeCompare(pulseTime) <= 0)?.title?.trim() || '';
    const arcTitle = (p.state_hash && arcTitleByStateHash[p.state_hash]?.trim()) || '';
    const semantic = pulseOverlay.pulseHeadlines[p.id]?.trim();
    const editorial = (p.headline ?? '').trim();
    const signalRef = semantic || editorial;

    let label: string =
      sourceTitle ||
      decisionTitle ||
      (signalRef && !GENERIC_FALLBACKS.has(signalRef.toLowerCase().trim()) && !isSystemPhrase(signalRef) ? signalRef : '') ||
      (arcTitle && !isSystemPhrase(arcTitle) ? arcTitle : '') ||
      pulseTypeFallback(p.pulse_type);

    if (GENERIC_FALLBACKS.has(label.toLowerCase().trim()) && latestStateHash && p.state_hash === latestStateHash && snapshotText?.trim()) {
      const phrase = readablePhrase(snapshotText);
      if (phrase) label = phrase;
    }
    return {
      id: p.id,
      occurred_at: p.occurred_at,
      kind: 'pulse' as const,
      label,
    };
  });

  const resultEvents = outcomesChrono.map((o) => {
    const summary = o.text.length > 60 ? o.text.slice(0, 57) + '…' : o.text;
    return {
      id: o.id,
      occurred_at: o.occurred_at,
      kind: 'result' as const,
      label: `Result: ${summary}`,
    };
  });

  projectTimelineEvents = [...pulseEvents, ...resultEvents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );

  // Disambiguate duplicate pulse labels (e.g. same arc title for 12+ pulses) so tooltips are unique
  const pulseLabelCount = new Map<string, number>();
  projectTimelineEvents = projectTimelineEvents.map((e) => {
    if (e.kind !== 'pulse') return e;
    const base = e.label;
    const n = (pulseLabelCount.get(base) ?? 0) + 1;
    pulseLabelCount.set(base, n);
    const label = n > 1 ? `${base} (${n})` : base;
    return { ...e, label };
  });

  // Load structural signals once (for timeline + contributing signals)
  let timelineEvents: Array<{
    kind: 'decision' | 'result';
    occurred_at: string;
    project_id: string;
  }> = [];
  let allSignals: StructuralSignal[] = [];

  const signalsStarted = Date.now();
  try {
    allSignals = await collectStructuralSignals(supabaseClient, user_id);
    timelineEvents = allSignals
      .filter(
        (signal) =>
          signal.project_id === project_id &&
          (signal.kind === 'decision' || signal.kind === 'result')
      )
      .map((signal) => ({
        kind: signal.kind as 'decision' | 'result',
        occurred_at: signal.occurred_at,
        project_id: signal.project_id || '',
      }))
      .sort(
        (a, b) =>
          new Date(a.occurred_at).getTime() -
          new Date(b.occurred_at).getTime()
      );

    if (isDevEnv()) {
      // eslint-disable-next-line no-console
      console.log('[ReadLoader][SignalsDone]', {
        user_id,
        project_id,
        ms: Date.now() - signalsStarted,
        signals_count: allSignals.length,
        timeline_events: timelineEvents.length,
      });
    }
  } catch (error) {
    if (isDevEnv()) {
      // eslint-disable-next-line no-console
      console.error('[ReadLoader][SignalsFailed]', {
        user_id,
        project_id,
        ms: Date.now() - signalsStarted,
        error_message: error instanceof Error ? error.message : String(error),
      });
    }
    // Degrade gracefully: timelineEvents remains empty.
  }

  // Contributing signals per active arc (derived from arc_signal_link + structural signals)
  if (activeArcs.length > 0 && allSignals.length > 0) {
    const arcIds = activeArcs.map((a) => a.id);
    const { data: arcSignalRows } = await supabaseClient
      .from('arc_signal_link')
      .select('arc_id, signal_id')
      .in('arc_id', arcIds)
      .eq('project_id', project_id);

    const signalById = new Map<string, StructuralSignal>();
    for (const s of allSignals) {
      signalById.set(s.id, s);
    }

    const linksByArc = new Map<string, StructuralSignal[]>();
    for (const row of arcSignalRows ?? []) {
      const r = row as { arc_id: string; signal_id: string };
      const sig = signalById.get(r.signal_id);
      if (!sig) continue;
      if (sig.project_id !== project_id) continue;
      if (!linksByArc.has(r.arc_id)) {
        linksByArc.set(r.arc_id, []);
      }
      linksByArc.get(r.arc_id)!.push(sig);
    }

    const decisionIds = new Set<string>();
    for (const sig of allSignals) {
      if (sig.kind === 'decision' && sig.source_id) {
        decisionIds.add(sig.source_id);
      }
    }

    let decisionTitleById = new Map<string, string>();
    if (decisionIds.size > 0) {
      const { data: decisionRows } = await supabaseClient
        .from('decisions')
        .select('id, title')
        .eq('user_id', user_id)
        .in('id', Array.from(decisionIds));
      decisionTitleById = new Map(
        (decisionRows ?? []).map((row: { id: string; title: string | null }) => [
          row.id,
          row.title ?? '',
        ])
      );
    }

    activeArcs = activeArcs.map((arc) => {
      const signals = (linksByArc.get(arc.id) ?? []).slice();
      if (signals.length === 0) return arc;

      // Order by most recent structural contribution
      signals.sort(
        (a, b) =>
          new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      );

      const items = signals
        .map((sig) => {
          let label: string | null = null;
          if (sig.kind === 'decision' && sig.source_id) {
            label = (decisionTitleById.get(sig.source_id) ?? '').trim() || null;
          }
          if (!label) {
            label =
              sig.kind === 'decision'
                ? 'Decision'
                : sig.kind === 'result'
                  ? 'Result'
                  : 'Signal';
          }
          return {
            id: sig.id,
            kind: sig.kind,
            label,
          };
        })
        .slice(0, 5);

      return {
        ...arc,
        contributingSignals: items,
      };
    });
  }

  return {
    project: project
      ? {
          id: project.id,
          name: project.name,
          thinking_started_at: project.thinking_started_at || null,
        }
      : null,
    latestSnapshotPayload,
    prevSnapshotPayload,
    snapshotText,
    snapshotGeneratedAt,
    projectSnapshots,
    latestSnapshotOutcomeText,
    activeArcs,
    tensions,
    timelineEvents,
    projectTimelineEvents,
  };
}

