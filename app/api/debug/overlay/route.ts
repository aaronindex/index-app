// app/api/debug/overlay/route.ts
// GET: overlay diagnostic for current user (so you can verify user_id + row counts in the browser).
// Use while logged in; compare response user_id to the user_id you pass to the backfill.

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServiceClient } from '@/lib/supabaseService';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();

    const { data: snapshot } = await supabase
      .from('snapshot_state')
      .select('state_hash')
      .eq('user_id', user.id)
      .eq('scope', 'global')
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const state_hash = (snapshot as { state_hash?: string } | null)?.state_hash ?? null;
    if (!state_hash) {
      return NextResponse.json({
        user_id: user.id,
        message: 'No global snapshot found',
        state_hash: null,
        total_rows: 0,
        direction_rows: 0,
        has_direction: false,
        direction_preview: null,
      });
    }

    const { data: rows } = await supabase
      .from('semantic_labels')
      .select('object_type, object_id, body, title')
      .eq('user_id', user.id)
      .eq('scope_type', 'global')
      .is('scope_id', null)
      .eq('state_hash', state_hash);

    const { count: directionCountAny } = await supabase
      .from('semantic_labels')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('scope_type', 'global')
      .is('scope_id', null)
      .eq('object_type', 'direction')
      .eq('object_id', 'current');

    const allRows = rows ?? [];
    const directionRows = allRows.filter(
      (r: { object_type: string; object_id: string }) =>
        r.object_type === 'direction' && r.object_id === 'current'
    ) as Array<{ body: string | null; title: string | null }>;
    const firstDirection = directionRows[0];
    const text = firstDirection
      ? (firstDirection.body ?? firstDirection.title ?? '').trim()
      : '';
    const direction_preview = text ? text.slice(0, 80) + (text.length > 80 ? '…' : '') : null;

    return NextResponse.json({
      user_id: user.id,
      state_hash_prefix: state_hash.substring(0, 16),
      total_rows: allRows.length,
      direction_rows: directionRows.length,
      direction_rows_any_state_hash: directionCountAny ?? 0,
      has_direction: !!text,
      direction_preview,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
