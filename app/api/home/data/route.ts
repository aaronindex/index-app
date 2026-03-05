// app/api/home/data/route.ts
// Landing page data: Direction (global snapshot), Shifts (pulses), Timeline (pulses), Weekly Log.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServiceClient } from '@/lib/supabaseService';
import { getHomePageData } from '@/lib/ui-data/home-page-data';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();
    const data = await getHomePageData(supabase, user.id, false);

    const url = request.nextUrl ?? new URL(request.url);
    const debugOverlay = url.searchParams.get('debug') === 'overlay';
    if (debugOverlay) {
      const serviceClient = getSupabaseServiceClient();
      const { data: snapshot } = await serviceClient
        .from('snapshot_state')
        .select('state_hash')
        .eq('user_id', user.id)
        .eq('scope', 'global')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const state_hash = (snapshot as { state_hash?: string } | null)?.state_hash ?? null;
      let overlay_debug: Record<string, unknown> = {
        user_id: user.id,
        state_hash_prefix: state_hash?.substring(0, 16) ?? null,
        total_rows: 0,
        direction_rows: 0,
        direction_rows_any_state_hash: 0,
        has_direction: !!data.direction?.snapshotText?.trim(),
        direction_preview: data.direction?.snapshotText?.trim()?.slice(0, 80) ?? null,
      };
      if (state_hash) {
        const { data: rows } = await serviceClient
          .from('semantic_labels')
          .select('object_type, object_id, body, title')
          .eq('user_id', user.id)
          .eq('scope_type', 'global')
          .is('scope_id', null)
          .eq('state_hash', state_hash);
        const allRows = rows ?? [];
        const directionRows = allRows.filter(
          (r: { object_type: string; object_id: string }) =>
            r.object_type === 'direction' && r.object_id === 'current'
        ) as Array<{ body: string | null; title: string | null }>;
        const { count: directionCountAny } = await serviceClient
          .from('semantic_labels')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('scope_type', 'global')
          .is('scope_id', null)
          .eq('object_type', 'direction')
          .eq('object_id', 'current');
        overlay_debug = {
          ...overlay_debug,
          total_rows: allRows.length,
          direction_rows: directionRows.length,
          direction_rows_any_state_hash: directionCountAny ?? 0,
          direction_preview: (directionRows[0] ? (directionRows[0].body ?? directionRows[0].title ?? '').trim().slice(0, 80) : null) ?? overlay_debug.direction_preview,
        };
      }
      return NextResponse.json({ ...data, overlay_debug });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Home data API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch home data' },
      { status: 500 }
    );
  }
}
