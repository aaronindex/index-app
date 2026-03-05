// lib/semantic-overlay/get-overlay.ts
// Fetch semantic overlay by scope and state_hash. Does not affect structural state.

import type { SupabaseClient } from '@supabase/supabase-js';
import { SEMANTIC_DIRECTION_OBJECT_ID } from './constants';

export type SemanticOverlay = {
  direction: string | null;
  arcTitles: Record<string, string>;
  pulseHeadlines: Record<string, string>;
};

type GetOverlayParams = {
  supabaseClient: SupabaseClient;
  user_id: string;
  scope_type: 'global' | 'project';
  scope_id?: string | null;
  state_hash: string;
  /** Arc IDs to resolve titles for (e.g. active_arc_ids) */
  arc_ids?: string[];
  /** Pulse id + state_hash pairs (pulse.state_hash can vary per pulse) */
  pulse_id_state_hash_pairs?: Array<{ pulse_id: string; state_hash: string }>;
};

/**
 * Load semantic overlay for a given scope and state_hash.
 * Returns direction text (body), arc id -> title, pulse id -> headline.
 * Direction: only rows with object_id = SEMANTIC_DIRECTION_OBJECT_ID; deterministic by generated_at desc.
 * Missing entries mean use placeholder; overlay never alters state_hash inputs.
 */
export async function getSemanticOverlay(params: GetOverlayParams): Promise<SemanticOverlay> {
  const { supabaseClient, user_id, scope_type, scope_id, state_hash, arc_ids = [], pulse_id_state_hash_pairs = [] } = params;

  const result: SemanticOverlay = {
    direction: null,
    arcTitles: {},
    pulseHeadlines: {},
  };

  let q = supabaseClient
    .from('semantic_labels')
    .select('object_type, object_id, scope_id, state_hash, title, body, generated_at')
    .eq('user_id', user_id)
    .eq('scope_type', scope_type);

  // NULL-safe scope_id: global or missing => IS NULL; else EQ
  if (scope_id == null || scope_id === undefined) {
    q = q.is('scope_id', null);
  } else {
    q = q.eq('scope_id', scope_id);
  }

  const { data: rows, error } = await q;

  if (error) {
    return result;
  }

  const pairSet = new Set(pulse_id_state_hash_pairs.map(({ pulse_id, state_hash: h }) => `${pulse_id}:${h}`));

  // Direction: only object_id = 'current', same state_hash; deterministic by generated_at desc
  const directionRows = (rows ?? []).filter(
    (row: { object_type: string; object_id: string; state_hash: string }) =>
      row.object_type === 'direction' &&
      row.object_id === SEMANTIC_DIRECTION_OBJECT_ID &&
      row.state_hash === state_hash
  ) as Array<{ body: string | null; title: string | null; generated_at: string }>;
  if (directionRows.length > 0) {
    directionRows.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime());
    const first = directionRows[0]!;
    const text = (first.body ?? first.title ?? '').trim();
    if (text) result.direction = text;
  }

  for (const row of rows ?? []) {
    const r = row as { object_type: string; object_id: string; state_hash: string; title: string | null; body: string | null };
    if (r.object_type === 'arc' && r.state_hash === state_hash && arc_ids.includes(r.object_id) && r.title?.trim()) {
      result.arcTitles[r.object_id] = r.title.trim();
    }
    if (r.object_type === 'pulse' && r.title?.trim()) {
      const inPairs = pairSet.size === 0 || pairSet.has(`${r.object_id}:${r.state_hash}`);
      if (inPairs) result.pulseHeadlines[r.object_id] = r.title.trim();
    }
  }

  return result;
}
