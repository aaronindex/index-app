// lib/ui-data/home-page-data.ts
// Server-side builder for home page payload. Used by API route and by home page for SSR.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabaseService';
import { loadHomeView } from './home.load';
import type { HomePulse } from './home.load';
import { collectStructuralSignals } from '@/lib/structure/signals';
import type { StructuralSignal } from '@/lib/structure/signals';

export type HomePageData = {
  hasConversations: boolean;
  hasProjects: boolean;
  showFocusModal: boolean;
  direction: {
    snapshotText: string | null;
    hasArcs: boolean;
    generatedAt: string | null;
    active_arc_count: number;
    project_count: number;
    lastChangeAt: string | null;
    signals?: Array<{ id: string; label: string }>;
    arc?: string | null;
    sourceCount?: number;
  };
  shifts: Array<{ id: string; occurred_at: string; label: string; pulse_type: string }>;
  timelineEvents: Array<{
    id: string;
    occurred_at: string;
    summary: string;
    pulse_type: string;
    isResult: boolean;
  }>;
  weeklyDigest: {
    id: string;
    week_start: string;
    week_end: string;
    body: string | null;
    summary: string | null;
  } | null;
  weekly_digest_enabled: boolean;
};

/** Treat system-generated phrases as empty so we show user-facing fallback. */
function isSystemPhrase(s: string): boolean {
  const lower = s.toLowerCase().trim();
  if (lower.length < 10) return false;
  if (/\b(threshold|momentum increased|structural threshold|in project)\b/.test(lower)) return true;
  if (/^(result recorded|structural shift|arc shift|tension emerging|structure updated)(\s|$)/i.test(lower)) return true;
  return false;
}

/**
 * Build timeline/shift labels for tooltips and lists.
 * Priority: decision title, signal/source title, or editorial highlight; fallback only when no human-readable content.
 */
function getTypedHeadline(p: HomePulse, semanticHeadline?: string | null): string {
  const semantic = (semanticHeadline || '').trim();
  const editorial = (p.headline || '').trim();
  const context = semantic || editorial;

  if (context && !isSystemPhrase(context)) return context;

  switch (p.pulse_type) {
    case 'result_recorded':
      return 'Result recorded';
    case 'structural_threshold':
    case 'arc_shift':
      return 'Structural shift detected';
    case 'tension':
      return 'Tension emerging';
    default:
      return 'Structure updated';
  }
}

const GENERIC_TOOLTIP_LABELS = new Set([
  'result recorded',
  'structural shift detected',
  'structural shift',
  'tension emerging',
  'structure updated',
]);

/** Softer, behavior-of-thinking fallbacks when no semantic/snapshot phrase exists (avoid system-telemetry tooltip body). */
const SOFT_TOOLTIP_FALLBACK: Record<string, string> = {
  'structural shift detected': 'A shift in focus',
  'structural shift': 'A shift in focus',
  'structure updated': 'Update to your structure',
  'tension emerging': 'A tension in focus',
};

const TOOLTIP_PHRASE_MAX_LEN = 80;

/** First clause, truncated at last full word (~80 chars) for timeline tooltip when headline is generic. */
function readablePhraseFromSnapshot(snapshotText: string | null | undefined, maxLen: number = TOOLTIP_PHRASE_MAX_LEN): string {
  const s = (snapshotText ?? '').trim();
  if (!s) return '';
  const clause = s.match(/^[^.!?]+/)?.[0]?.trim() ?? s;
  const out = clause.length <= maxLen
    ? clause
    : clause.slice(0, maxLen).replace(/\s+\S*$/, '').trim();
  return out.length >= 8 ? out : '';
}

/**
 * Best label for timeline/shift.
 * Priority: 1) Arc title, 2) Semantic headline, 3) Snapshot phrase when pulse matches latest state, 4) Generic fallback.
 */
function getTimelineLabel(
  p: HomePulse,
  semanticHeadline: string | null | undefined,
  snapshotTextForLatestState: string | null | undefined,
  latestStateHash: string | null,
  arcTitle?: string | null
): string {
  const arcLabel = (arcTitle ?? '').trim();
  if (arcLabel && !isSystemPhrase(arcLabel)) return arcLabel;

  const candidate = getTypedHeadline(p, semanticHeadline);
  const normalized = candidate.trim().toLowerCase();
  if (!GENERIC_TOOLTIP_LABELS.has(normalized)) return candidate;
  if (latestStateHash && p.state_hash === latestStateHash && snapshotTextForLatestState) {
    const phrase = readablePhraseFromSnapshot(snapshotTextForLatestState);
    if (phrase) return phrase;
  }
  return SOFT_TOOLTIP_FALLBACK[normalized] ?? candidate;
}

function dedupePulses(pulses: HomePulse[]): HomePulse[] {
  const result: HomePulse[] = [];
  for (const pulse of pulses) {
    const occurred = pulse.occurred_at || '';
    const day = occurred.slice(0, 10);
    if (!day) {
      result.push(pulse);
      continue;
    }
    const last = result[result.length - 1];
    if (last) {
      const lastDay = (last.occurred_at || '').slice(0, 10);
      const sameProject = (last.project_id || null) === (pulse.project_id || null);
      if (last.pulse_type === pulse.pulse_type && lastDay === day && sameProject) continue;
    }
    result.push(pulse);
  }
  return result;
}

function formatDigestBody(d: {
  summary?: string | null;
  top_themes?: unknown;
  open_loops?: unknown;
}): string {
  const parts: string[] = [];
  if (d.summary && String(d.summary).trim()) parts.push(String(d.summary).trim());
  const themes = Array.isArray(d.top_themes) ? d.top_themes : [];
  if (themes.length > 0) {
    const themeLines = themes.map((t: unknown) => (typeof t === 'string' ? t : String(t)).trim()).filter(Boolean);
    if (themeLines.length > 0) parts.push(themeLines.map((line) => `• ${line}`).join('\n'));
  }
  const loops = Array.isArray(d.open_loops) ? d.open_loops : [];
  if (loops.length > 0) {
    const loopLines = loops.map((l: unknown) => (typeof l === 'string' ? l : String(l)).trim()).filter(Boolean);
    if (loopLines.length > 0) parts.push(loopLines.map((line) => `• ${line}`).join('\n'));
  }
  if (parts.length === 0) return '';
  return parts.join('\n\n');
}

/**
 * Build home page payload server-side. Use for SSR (home page) and for API route.
 * focusModalDismissed: true when cookie index_focus_modal_dismissed is set (server reads cookie and passes here).
 */
export async function getHomePageData(
  supabase: SupabaseClient,
  user_id: string,
  focusModalDismissed: boolean = false
): Promise<HomePageData> {
  // Use service client for structural state + overlay (bypasses RLS), but keep session client for user-facing counts.
  const serviceClient = getSupabaseServiceClient();
  const [homeView, conversationCountResult, projectCountResult, digestResult, profileResult] = await Promise.all([
    loadHomeView({ supabaseClient: serviceClient, user_id, overlayClient: serviceClient }),
    supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', user_id),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user_id),
    supabase
      .from('weekly_digests')
      .select('id, week_start, week_end, summary, top_themes, open_loops')
      .eq('user_id', user_id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('profiles').select('weekly_digest_enabled').eq('id', user_id).maybeSingle(),
  ]);

  const hasConversations = (conversationCountResult.count ?? 0) > 0;
  const hasProjects = (projectCountResult.count ?? 0) > 0;
  const latestDigest = digestResult.data ?? null;
  const weeklyDigestText = latestDigest ? formatDigestBody(latestDigest) : null;
  const showFocusModal =
    hasConversations && !weeklyDigestText && !focusModalDismissed;

  const payload = homeView.latestSnapshot?.state_payload as { active_arc_ids?: string[] } | null | undefined;
  const hasArcs = Array.isArray(payload?.active_arc_ids) && payload.active_arc_ids.length > 0;
  const active_arc_count = Array.isArray(payload?.active_arc_ids) ? payload.active_arc_ids.length : 0;
  const project_count = projectCountResult.count ?? 0;

  let directionText =
    homeView.semanticDirection?.trim() ||
    homeView.latestSnapshot?.snapshot_text?.trim() ||
    null;

  // Safety net: if Direction is still empty but we know overlay exists (debug tools / DB show direction rows),
  // query semantic_labels directly for the latest global direction row (any state_hash) and use that text.
  if (!directionText) {
    const { data: latestDirectionRows } = await serviceClient
      .from('semantic_labels')
      .select('body, title, generated_at')
      .eq('user_id', user_id)
      .eq('scope_type', 'global')
      .is('scope_id', null)
      .eq('object_type', 'direction')
      .eq('object_id', 'current')
      .order('generated_at', { ascending: false })
      .limit(1);
    const row = (latestDirectionRows ?? [])[0] as { body: string | null; title: string | null } | undefined;
    const text = row ? (row.body ?? row.title ?? '').trim() : '';
    if (text) {
      directionText = text;
    }
  }

  const semanticHeadlines = homeView.semanticPulseHeadlines ?? {};
  const deduped = dedupePulses(homeView.pulses);
  const shiftSource = deduped.slice(0, 5);
  const lastChangeAt = shiftSource.length > 0 ? shiftSource[0]!.occurred_at : null;

  const latestStateHash = homeView.latestSnapshot?.state_hash ?? null;

  // Resolve arc title per state_hash so timeline/shift labels prefer arc title (structural coherence with Active Arcs).
  const arcTitleByStateHash: Record<string, string> = {};
  try {
    const distinctStateHashes = [...new Set(homeView.pulses.map((p) => p.state_hash).filter(Boolean))] as string[];
    const stateHashToArcIds: Record<string, string[]> = {};
    if (latestStateHash && payload?.active_arc_ids) {
      stateHashToArcIds[latestStateHash] = payload.active_arc_ids;
    }
    const otherHashes = distinctStateHashes.filter((h) => h !== latestStateHash);
    if (otherHashes.length > 0) {
      const { data: otherSnapshots } = await serviceClient
        .from('snapshot_state')
        .select('state_hash, state_payload')
        .eq('user_id', user_id)
        .eq('scope', 'global')
        .in('state_hash', otherHashes);
      for (const row of otherSnapshots ?? []) {
        const r = row as { state_hash: string; state_payload?: { active_arc_ids?: string[] } | null };
        const ids = Array.isArray(r.state_payload?.active_arc_ids) ? r.state_payload.active_arc_ids : [];
        if (ids.length > 0) stateHashToArcIds[r.state_hash] = ids;
      }
    }
    const firstArcIds = [...new Set(Object.values(stateHashToArcIds).map((ids) => ids[0]).filter(Boolean))] as string[];
    if (firstArcIds.length > 0) {
      const { data: arcRows } = await serviceClient
        .from('arc')
        .select('id, summary')
        .eq('user_id', user_id)
        .in('id', firstArcIds);
      const arcIdToTitle = new Map(
        (arcRows ?? []).map((row: { id: string; summary: string | null }) => [row.id, (row.summary ?? '').trim()])
      );
      for (const [h, ids] of Object.entries(stateHashToArcIds)) {
        const title = ids[0] ? arcIdToTitle.get(ids[0]) : '';
        if (title) arcTitleByStateHash[h] = title;
      }
    }
  } catch {
    // Non-fatal: timeline falls back to semantic/snapshot/generic labels.
  }

  // Shifts list (textual): dedupe by headline + day; generic headlines by (headline + day) only.
  // Normalize headline: trim + collapse whitespace. Keep earliest occurrence per key; preserve order.
  const pulseById = new Map(homeView.pulses.map((p) => [p.id, p]));
  const rawShifts = shiftSource.map((p) => {
    const label = getTimelineLabel(
      p,
      semanticHeadlines[p.id],
      directionText,
      latestStateHash,
      arcTitleByStateHash[p.state_hash]
    );
    const normalized = label.trim().replace(/\s+/g, ' ').toLowerCase();
    return {
      id: p.id,
      occurred_at: p.occurred_at,
      label,
      pulse_type: p.pulse_type,
      normalized,
    };
  });
  const GENERIC_HEADLINES = new Set([
    'structure updated',
    'arc shift detected',
    'structural threshold crossed',
    'tension detected',
    'result recorded',
    'momentum increased',
    'arc shift',
    'structural shift',
    'structural shift detected',
    'milestone recorded',
    'tension emerging',
    'signals reinforced direction',
    'a new thread of thinking appeared',
    'a shift in focus',
    'a tension in focus',
    'update to your structure',
  ]);
  const seenKeys = new Set<string>();
  const dedupedShifts: Array<{ id: string; occurred_at: string; label: string; pulse_type: string }> = [];
  // Walk from oldest to newest so we keep the earliest occurrence for each key.
  for (let i = rawShifts.length - 1; i >= 0; i -= 1) {
    const s = rawShifts[i]!;
    const pulse = pulseById.get(s.id) as HomePulse | undefined;
    const stateHash = pulse?.state_hash || '';
    const day = (s.occurred_at || '').slice(0, 10);
    const key = GENERIC_HEADLINES.has(s.normalized)
      ? `${s.normalized}|${day}`
      : `${s.normalized}|${stateHash}|${day}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      dedupedShifts.push({ id: s.id, occurred_at: s.occurred_at, label: s.label, pulse_type: s.pulse_type });
    }
  }
  dedupedShifts.reverse();
  const shifts = dedupedShifts;

  const timelineEvents = [...shiftSource]
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
    .map((p) => ({
      id: p.id,
      occurred_at: p.occurred_at,
      summary: getTimelineLabel(
        p,
        semanticHeadlines[p.id],
        directionText,
        latestStateHash,
        arcTitleByStateHash[p.state_hash]
      ),
      pulse_type: p.pulse_type,
      isResult: p.pulse_type === 'result_recorded',
    }));

  const profile = profileResult.data;

  // Resolve a small set of signals informing Direction (global, across arcs)
  let directionSignals: Array<{ id: string; label: string }> = [];
  let directionArc: string | null = null;
  let directionSourceCount = 0;
  try {
    const latestStateHash = homeView.latestSnapshot?.state_hash ?? null;
    const activeArcIds = Array.isArray(payload?.active_arc_ids) ? payload!.active_arc_ids! : [];
    if (latestStateHash && activeArcIds.length > 0) {
      const serviceClientForSignals = getSupabaseServiceClient();

      // Fetch arc summary so Read structure can show whenever there are active arcs (even with no linked signals)
      const { data: arcRows } = await serviceClientForSignals
        .from('arc')
        .select('id, summary')
        .in('id', activeArcIds)
        .limit(1);
      directionArc = (arcRows?.[0] as { summary?: string | null } | undefined)?.summary?.trim() ?? null;

      const allSignals: StructuralSignal[] = await collectStructuralSignals(
        serviceClientForSignals as unknown as SupabaseClient,
        user_id
      );

      const signalById = new Map<string, StructuralSignal>();
      for (const s of allSignals) {
        signalById.set(s.id, s);
      }

      const { data: arcSignalRows } = await serviceClientForSignals
        .from('arc_signal_link')
        .select('arc_id, signal_id')
        .in('arc_id', activeArcIds);

      const contributingSignals: StructuralSignal[] = [];
      for (const row of arcSignalRows ?? []) {
        const r = row as { arc_id: string; signal_id: string };
        const sig = signalById.get(r.signal_id);
        if (!sig) continue;
        contributingSignals.push(sig);
      }

      if (contributingSignals.length > 0) {
        const decisionIds = new Set<string>();
        for (const sig of contributingSignals) {
          if (sig.kind === 'decision' && sig.source_id) {
            decisionIds.add(sig.source_id);
          }
        }

        let decisionTitleById = new Map<string, string>();
        if (decisionIds.size > 0) {
          const { data: decisionRows } = await serviceClientForSignals
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

        // Sort by occurred_at descending and take top 5
        const sorted = [...contributingSignals].sort(
          (a, b) =>
            new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        );

        directionSignals = sorted.slice(0, 5).map((sig) => {
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
            label,
          };
        });
        directionSourceCount = new Set(
          contributingSignals.map((s) => s.project_id).filter(Boolean)
        ).size;
      }
    }
  } catch {
    // If Direction signal resolution fails, proceed without chain info.
    directionSignals = [];
  }

  return {
    hasConversations,
    hasProjects,
    showFocusModal,
    direction: {
      snapshotText: directionText,
      hasArcs,
      generatedAt: homeView.latestSnapshot?.generated_at ?? null,
      active_arc_count,
      project_count,
      lastChangeAt,
      signals: directionSignals,
      arc: directionArc,
      sourceCount: directionSourceCount > 0 ? directionSourceCount : undefined,
    },
    shifts,
    timelineEvents,
    weeklyDigest: latestDigest
      ? {
          id: latestDigest.id,
          week_start: latestDigest.week_start,
          week_end: latestDigest.week_end,
          body: weeklyDigestText,
          summary: latestDigest.summary,
        }
      : null,
    weekly_digest_enabled: profile?.weekly_digest_enabled ?? true,
  };
}
