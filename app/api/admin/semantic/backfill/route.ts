// app/api/admin/semantic/backfill/route.ts
// Admin-only: backfill semantic labels for latest global or project state_hash on demand.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAppBaseUrl } from '@/lib/url';
import { SEMANTIC_DIRECTION_OBJECT_ID } from '@/lib/semantic-overlay/constants';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type ArcRow = { id: string; summary: string | null; created_at: string | null; last_signal_at: string | null };
type PhaseRow = { arc_id: string; phase_index: number; summary: string | null; started_at: string | null; last_signal_at: string | null };

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-index-admin-secret') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const expected = process.env.INDEX_ADMIN_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { user_id: string; scope_type: 'global' | 'project'; scope_id?: string };
  try {
    body = (await request.json()) as { user_id: string; scope_type: 'global' | 'project'; scope_id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let { user_id, scope_type, scope_id } = body;
  if (!user_id || !scope_type) {
    return NextResponse.json({ error: 'Missing required fields: user_id, scope_type' }, { status: 400 });
  }

  // Normalize scope_id: global => SQL NULL; project => require string
  if (scope_type === 'global') {
    scope_id = undefined;
  } else if (scope_type === 'project') {
    if (!scope_id || typeof scope_id !== 'string') {
      return NextResponse.json({ error: 'scope_id required when scope_type is project' }, { status: 400 });
    }
  }

  const supabase = getServiceClient();

  if (scope_type === 'global') {
    const { data: snapshot, error: snapError } = await supabase
      .from('snapshot_state')
      .select('state_hash, state_payload')
      .eq('user_id', user_id)
      .eq('scope', 'global')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapError || !snapshot) {
      return NextResponse.json({ error: 'No global snapshot found', ok: false }, { status: 404 });
    }

    const state_hash = (snapshot as { state_hash: string }).state_hash;
    const payload = (snapshot as { state_payload?: { active_arc_ids?: string[] } }).state_payload;
    const active_arc_ids = payload?.active_arc_ids ?? [];

    let arcs: Array<{ id: string; phase: number | null; summary: string | null; started_at: string | null; last_signal_at: string | null }> = [];
    if (active_arc_ids.length > 0) {
      const { data: arcRows } = await supabase
        .from('arc')
        .select('id, summary, created_at, last_signal_at')
        .eq('user_id', user_id)
        .in('id', active_arc_ids);
      const arcList = (arcRows ?? []) as ArcRow[];

      const { data: phaseRows } = await supabase
        .from('phase')
        .select('arc_id, phase_index, summary, started_at, last_signal_at')
        .in('arc_id', active_arc_ids)
        .order('phase_index', { ascending: false })
        .order('created_at', { ascending: false });
      const phasesByArc = new Map<string, PhaseRow>();
      for (const row of (phaseRows ?? []) as PhaseRow[]) {
        if (!phasesByArc.has(row.arc_id)) phasesByArc.set(row.arc_id, row);
      }

      arcs = arcList.map((arc) => {
        const phase = phasesByArc.get(arc.id);
        return {
          id: arc.id,
          phase: phase?.phase_index ?? null,
          summary: arc.summary ?? null,
          started_at: phase?.started_at ?? arc.created_at ?? null,
          last_signal_at: arc.last_signal_at ?? null,
        };
      });
    }

    const { data: pulseRows } = await supabase
      .from('pulse')
      .select('id, pulse_type, project_id, occurred_at')
      .eq('user_id', user_id)
      .eq('scope', 'global')
      .eq('state_hash', state_hash)
      .order('occurred_at', { ascending: false })
      .limit(50);

    const pulses = (pulseRows ?? []).map((r: { id: string; pulse_type: string; project_id: string | null; occurred_at: string }) => ({
      id: r.id,
      pulse_type: r.pulse_type ?? '',
      project_id: r.project_id ?? null,
      occurred_at: r.occurred_at ?? new Date().toISOString(),
    }));

    const { count: outcomeCount } = await supabase
      .from('project_outcome')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    const baseUrl = getAppBaseUrl();
    const generateUrl = new URL('/api/admin/semantic/generate', baseUrl).toString();

    const res = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-index-admin-secret': expected,
      },
      body: JSON.stringify({
        user_id,
        scope_type: 'global',
        scope_id: null,
        state_hash,
        arcs: arcs.length > 0 ? arcs : active_arc_ids.map((id) => ({ id, phase: null, summary: null, started_at: null, last_signal_at: null })),
        pulses,
        stats: {
          active_arc_count: active_arc_ids.length,
          pulse_count: pulses.length,
          outcome_count: outcomeCount ?? 0,
          decision_count: 0,
          project_count: projectCount ?? 0,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Generate failed', details: err.slice(0, 200), ok: false }, { status: 502 });
    }

    const result = (await res.json()) as { arc_titles?: Record<string, string>; pulse_headlines?: Record<string, string>; direction?: string | null };
    const wrote = {
      direction: result.direction ? 1 : 0,
      arcs: Object.keys(result.arc_titles ?? {}).length,
      pulses: Object.keys(result.pulse_headlines ?? {}).length,
    };

    const { data: labels } = await supabase
      .from('semantic_labels')
      .select('object_type')
      .eq('user_id', user_id)
      .eq('scope_type', 'global')
      .is('scope_id', null)
      .eq('state_hash', state_hash);

    const rows = labels ?? [];
    const counts = {
      direction: rows.filter((r: { object_type: string }) => r.object_type === 'direction').length,
      arcs: rows.filter((r: { object_type: string }) => r.object_type === 'arc').length,
      pulses: rows.filter((r: { object_type: string }) => r.object_type === 'pulse').length,
    };

    return NextResponse.json({
      ok: true,
      wrote,
      state_hash_prefix: state_hash.substring(0, 16),
      counts,
      direction_object_id: SEMANTIC_DIRECTION_OBJECT_ID,
    });
  }

  const projectId = scope_id!;
  const { data: snapshot, error: snapError } = await supabase
    .from('snapshot_state')
    .select('state_hash, state_payload')
    .eq('user_id', user_id)
    .eq('scope', 'project')
    .eq('project_id', projectId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapError || !snapshot) {
    return NextResponse.json({ error: 'No project snapshot found', ok: false }, { status: 404 });
  }

  const state_hash = (snapshot as { state_hash: string }).state_hash;
  const payload = (snapshot as { state_payload?: { active_arc_ids?: string[] } }).state_payload;
  const active_arc_ids = payload?.active_arc_ids ?? [];

  let arcs: Array<{ id: string; phase: number | null; summary: string | null; started_at: string | null; last_signal_at: string | null }> = [];
  if (active_arc_ids.length > 0) {
    const { data: arcRows } = await supabase
      .from('arc')
      .select('id, summary, created_at, last_signal_at')
      .eq('user_id', user_id)
      .in('id', active_arc_ids);
    const arcList = (arcRows ?? []) as ArcRow[];

    const { data: phaseRows } = await supabase
      .from('phase')
      .select('arc_id, phase_index, summary, started_at, last_signal_at')
      .in('arc_id', active_arc_ids)
      .order('phase_index', { ascending: false })
      .order('created_at', { ascending: false });
    const phasesByArc = new Map<string, PhaseRow>();
    for (const row of (phaseRows ?? []) as PhaseRow[]) {
      if (!phasesByArc.has(row.arc_id)) phasesByArc.set(row.arc_id, row);
    }

    arcs = arcList.map((arc) => {
      const phase = phasesByArc.get(arc.id);
      return {
        id: arc.id,
        phase: phase?.phase_index ?? null,
        summary: arc.summary ?? null,
        started_at: phase?.started_at ?? arc.created_at ?? null,
        last_signal_at: arc.last_signal_at ?? null,
      };
    });
  }

  const baseUrl = getAppBaseUrl();
  const generateUrl = new URL('/api/admin/semantic/generate', baseUrl).toString();

  const res = await fetch(generateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-index-admin-secret': expected,
    },
    body: JSON.stringify({
      user_id,
      scope_type: 'project',
      scope_id: projectId,
      state_hash,
      arcs: arcs.length > 0 ? arcs : active_arc_ids.map((id) => ({ id, phase: null, summary: null, started_at: null, last_signal_at: null })),
      pulses: [],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: 'Generate failed', details: err.slice(0, 200), ok: false }, { status: 502 });
  }

  const result = (await res.json()) as { arc_titles?: Record<string, string>; direction?: string | null };
  const wrote = {
    direction: result.direction ? 1 : 0,
    arcs: Object.keys(result.arc_titles ?? {}).length,
    pulses: 0,
  };

  const { data: labels } = await supabase
    .from('semantic_labels')
    .select('object_type')
    .eq('user_id', user_id)
    .eq('scope_type', 'project')
    .eq('scope_id', projectId)
    .eq('state_hash', state_hash);

  const rows = labels ?? [];
  const counts = {
    direction: rows.filter((r: { object_type: string }) => r.object_type === 'direction').length,
    arcs: rows.filter((r: { object_type: string }) => r.object_type === 'arc').length,
    pulses: rows.filter((r: { object_type: string }) => r.object_type === 'pulse').length,
  };

  return NextResponse.json({
    ok: true,
    wrote,
    state_hash_prefix: state_hash.substring(0, 16),
    counts,
    direction_object_id: SEMANTIC_DIRECTION_OBJECT_ID,
  });
}
