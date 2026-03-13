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

/**
 * Build timeline/shift labels for tooltips and lists.
 * Priority: user-recognizable content (decision title, source title, highlight/summary).
 * Avoid system phrases like "threshold reached", "momentum increased"; use short fallback only when no context.
 */
function getTypedHeadline(p: HomePulse, semanticHeadline?: string | null): string {
  const semantic = (semanticHeadline || '').trim();
  const editorial = (p.headline || '').trim();
  const context = semantic || editorial;

  if (context) return context;

  switch (p.pulse_type) {
    case 'result_recorded':
      return 'Result recorded';
    case 'structural_threshold':
    case 'arc_shift':
      return 'Structural shift';
    case 'tension':
      return 'Tension emerging';
    default:
      return 'Structure updated';
  }
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

  // Shifts list (textual): dedupe by headline + day; generic headlines by (headline + day) only.
  // Normalize headline: trim + collapse whitespace. Keep earliest occurrence per key; preserve order.
  const pulseById = new Map(homeView.pulses.map((p) => [p.id, p]));
  const rawShifts = shiftSource.map((p) => {
    const label = getTypedHeadline(p, semanticHeadlines[p.id]);
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
    'milestone recorded',
    'tension emerging',
    'signals reinforced direction',
    'a new thread of thinking appeared',
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
      summary: getTypedHeadline(p, semanticHeadlines[p.id]),
      pulse_type: p.pulse_type,
      isResult: p.pulse_type === 'result_recorded',
    }));

  const profile = profileResult.data;

  // Resolve a small set of signals informing Direction (global, across arcs)
  let directionSignals: Array<{ id: string; label: string }> = [];
  try {
    const latestStateHash = homeView.latestSnapshot?.state_hash ?? null;
    const activeArcIds = Array.isArray(payload?.active_arc_ids) ? payload!.active_arc_ids! : [];
    if (latestStateHash && activeArcIds.length > 0) {
      const serviceClientForSignals = getSupabaseServiceClient();
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
