// app/api/home/data/route.ts
// Landing page data: Direction (global snapshot), Shifts (pulses), Timeline (pulses), Weekly Digest.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { loadHomeView } from '@/lib/ui-data/home.load';
import type { HomePulse } from '@/lib/ui-data/home.load';

function formatPulseShiftLabel(p: HomePulse): string {
  const headline = (p.headline || '').trim();
  switch (p.pulse_type) {
    case 'result_recorded':
      return headline ? `Result recorded: ${headline}` : 'Result recorded';
    case 'arc_shift':
      return headline || 'Arc shifted phase';
    case 'structural_threshold':
      return headline || 'Structural threshold';
    case 'tension':
      return headline || 'Tension';
    default:
      return headline || 'Structural shift';
  }
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

    const [homeView, conversationCountResult, projectCountResult, digestResult] = await Promise.all([
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
    ]);

    const hasConversations = (conversationCountResult.count ?? 0) > 0;
    const hasProjects = (projectCountResult.count ?? 0) > 0;
    const latestDigest = digestResult.data ?? null;

    const payload = homeView.latestSnapshot?.state_payload as { active_arc_ids?: string[] } | null | undefined;
    const hasArcs = Array.isArray(payload?.active_arc_ids) && payload.active_arc_ids.length > 0;

    const directionText =
      homeView.latestSnapshot?.snapshot_text?.trim() ||
      (hasArcs ? null : 'Your INDEX will show the direction of your thinking as sources are distilled.');

    const shifts = homeView.pulses.slice(0, 5).map((p) => ({
      id: p.id,
      occurred_at: p.occurred_at,
      label: formatPulseShiftLabel(p),
      pulse_type: p.pulse_type,
    }));

    const timelineEvents = homeView.pulses.map((p) => ({
      id: p.id,
      occurred_at: p.occurred_at,
      summary: formatPulseShiftLabel(p),
      pulse_type: p.pulse_type,
      isResult: p.pulse_type === 'result_recorded',
    }));

    const weeklyDigestText = latestDigest
      ? formatDigestBody(latestDigest)
      : null;

    return NextResponse.json({
      hasConversations,
      hasProjects,
      direction: {
        snapshotText: directionText,
        hasArcs,
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
    });
  } catch (error) {
    console.error('Home data API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch home data' },
      { status: 500 }
    );
  }
}
