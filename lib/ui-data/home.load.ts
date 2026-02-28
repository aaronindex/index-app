// lib/ui-data/home.load.ts
// Load structural state data for homepage view (projection layer input)
// Read-only, no inference. Returns data for Direction + Shifts projection only.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuralStatePayload } from '@/lib/structure/hash';

export type HomeViewData = {
  latestSnapshot: {
    id: string;
    state_hash: string;
    generated_at: string;
    state_payload: StructuralStatePayload | null;
  } | null;
  /** Previous snapshot payload for Shifts projection (null if only one snapshot) */
  prevSnapshotPayload: StructuralStatePayload | null;
};

/**
 * Load home view data for structural projection (Direction + Shifts).
 * Fetches latest two snapshots only. No arc/phase/pulse tables.
 */
export async function loadHomeView(params: {
  supabaseClient: SupabaseClient;
  user_id: string;
}): Promise<HomeViewData> {
  const { supabaseClient, user_id } = params;

  const { data: snapshots } = await supabaseClient
    .from('snapshot_state')
    .select('id, state_hash, generated_at, created_at, state_payload')
    .eq('user_id', user_id)
    .eq('scope', 'global')
    // Prefer generated_at for ordering, but fall back to created_at deterministically.
    .order('generated_at', { ascending: false, nullsLast: true })
    .order('created_at', { ascending: false })
    .limit(2);

  const latest = snapshots?.[0] ?? null;
  const prev = snapshots?.[1] ?? null;

  return {
    latestSnapshot: latest
      ? {
          id: latest.id,
          state_hash: latest.state_hash,
          generated_at: latest.generated_at,
          state_payload: latest.state_payload as StructuralStatePayload | null,
        }
      : null,
    prevSnapshotPayload: prev?.state_payload
      ? (prev.state_payload as StructuralStatePayload)
      : null,
  };
}
