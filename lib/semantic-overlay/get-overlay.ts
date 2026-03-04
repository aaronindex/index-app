// lib/semantic-overlay/get-overlay.ts
// Fetch semantic overlay by scope and state_hash. Does not affect structural state.

import type { SupabaseClient } from '@supabase/supabase-js';

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
    .select('object_type, object_id, scope_id, state_hash, title, body')
    .eq('user_id', user_id)
    .eq('scope_type', scope_type);

  if (scope_type === 'global') {
    q = q.is('scope_id', null);
  } else if (scope_id != null) {
    q = q.eq('scope_id', scope_id);
  }

  const { data: rows, error } = await q;

  if (error) {
    return result;
  }

  const pairSet = new Set(pulse_id_state_hash_pairs.map(({ pulse_id, state_hash: h }) => `${pulse_id}:${h}`));

  for (const row of rows ?? []) {
    const r = row as { object_type: string; object_id: string; state_hash: string; title: string | null; body: string | null };
    if (r.object_type === 'direction' && r.state_hash === state_hash && r.body?.trim()) {
      result.direction = r.body.trim();
      continue;
    }
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
