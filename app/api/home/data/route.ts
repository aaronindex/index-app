// app/api/home/data/route.ts
// Landing page data: Direction (global snapshot), Shifts (pulses), Timeline (pulses), Weekly Digest.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { loadHomeView } from '@/lib/ui-data/home.load';
import type { HomePulse } from '@/lib/ui-data/home.load';

function formatPulseShiftLabel(p: HomePulse): string {
  const headline = (p.headline || '').trim();
  if (headline) return headline;

  switch (p.pulse_type) {
    case 'tension':
      return 'Structural tension surfaced';
    case 'arc_shift':
      return 'Arc shift';
    case 'structural_threshold':
      return 'Structural threshold';
    case 'result_recorded':
      return 'Result recorded';
    default:
      return 'Structural shift';
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
      const sameProject =
        (last.project_id || null) === (pulse.project_id || null);
      if (
        last.pulse_type === pulse.pulse_type &&
        lastDay === day &&
        sameProject
      ) {
        // Collapse obvious duplicate (same type + same day + same project/null)
        continue;
      }
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
  if (d.summary && String(d.summary).trim()) {
    parts.push(String(d.summary).trim());
  }
  const themes = Array.isArray(d.top_themes) ? d.top_themes : [];
  if (themes.length > 0) {
    const themeLines = themes.map((t: unknown) => (typeof t === 'string' ? t : String(t)).trim()).filter(Boolean);
    if (themeLines.length > 0) {
      parts.push(themeLines.map((line) => `• ${line}`).join('\n'));
    }
  }
  const loops = Array.isArray(d.open_loops) ? d.open_loops : [];
  if (loops.length > 0) {
    const loopLines = loops.map((l: unknown) => (typeof l === 'string' ? l : String(l)).trim()).filter(Boolean);
    if (loopLines.length > 0) {
      parts.push(loopLines.map((line) => `• ${line}`).join('\n'));
    }
  }
  if (parts.length === 0) return '';
  return parts.join('\n\n');
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    const [homeView, conversationCountResult, projectCountResult, digestResult, profileResult] = await Promise.all([
      loadHomeView({ supabaseClient: supabase, user_id: user.id }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase
        .from('weekly_digests')
        .select('id, week_start, week_end, summary, top_themes, open_loops')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('profiles').select('weekly_digest_enabled').eq('id', user.id).maybeSingle(),
    ]);

    const hasConversations = (conversationCountResult.count ?? 0) > 0;
    const hasProjects = (projectCountResult.count ?? 0) > 0;
    const latestDigest = digestResult.data ?? null;

    const payload = homeView.latestSnapshot?.state_payload as { active_arc_ids?: string[] } | null | undefined;
    const hasArcs = Array.isArray(payload?.active_arc_ids) && payload.active_arc_ids.length > 0;

    const directionText =
      homeView.latestSnapshot?.snapshot_text?.trim() || null;

    // Shifts source: de-duplicated pulses (newest first), capped to last ~5 items
    const deduped = dedupePulses(homeView.pulses);
    const shiftSource = deduped.slice(0, 5);
    const shifts = shiftSource.map((p) => ({
      id: p.id,
      occurred_at: p.occurred_at,
      label: formatPulseShiftLabel(p),
      pulse_type: p.pulse_type,
    }));

    // Timeline: same events as Shifts, ordered by occurred_at asc for display
    const timelineEvents = [...shiftSource]
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
      .map((p) => ({
        id: p.id,
        occurred_at: p.occurred_at,
        summary: formatPulseShiftLabel(p),
        pulse_type: p.pulse_type,
        isResult: p.pulse_type === 'result_recorded',
      }));

    const weeklyDigestText = latestDigest
      ? formatDigestBody(latestDigest)
      : null;

    const profile = profileResult.data;
    return NextResponse.json({
      hasConversations,
      hasProjects,
      direction: {
        snapshotText: directionText,
        hasArcs,
        generatedAt: homeView.latestSnapshot?.generated_at ?? null,
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
    });
  } catch (error) {
    console.error('Home data API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch home data' },
      { status: 500 }
    );
  }
}
