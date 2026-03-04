// lib/ui-data/home.load.ts
// Load structural state data for homepage view (Direction, Shifts, Timeline).
// Read-only, no inference.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuralStatePayload } from '@/lib/structure/hash';
import { getSemanticOverlay } from '@/lib/semantic-overlay/get-overlay';

export type HomePulse = {
  id: string;
  pulse_type: string;
  headline: string | null;
  state_hash: string;
  occurred_at: string;
  project_id: string | null;
};

export type HomeViewData = {
  latestSnapshot: {
    id: string;
    state_hash: string;
    generated_at: string;
    snapshot_text: string | null;
    state_payload: StructuralStatePayload | null;
  } | null;
  /** Previous snapshot payload for Shifts projection (null if only one snapshot) */
  prevSnapshotPayload: StructuralStatePayload | null;
  /** Recent global pulses (newest first), for Shifts list and Timeline */
  pulses: HomePulse[];
  /** Semantic direction text when overlay exists for latest state_hash */
  semanticDirection: string | null;
  /** Semantic headline per pulse id when overlay exists */
  semanticPulseHeadlines: Record<string, string>;
};

const PULSE_TYPES_FOR_LANDING = ['arc_shift', 'structural_threshold', 'tension', 'result_recorded'] as const;

/**
 * Load home view data for Direction, Shifts, and Timeline.
 * Fetches latest global snapshot (with snapshot_text), previous payload, and recent pulses.
 */
export async function loadHomeView(params: {
  supabaseClient: SupabaseClient;
  user_id: string;
}): Promise<HomeViewData> {
  const { supabaseClient, user_id } = params;

  const { data: snapshots } = await supabaseClient
    .from('snapshot_state')
    .select('id, state_hash, generated_at, created_at, state_payload, snapshot_text')
    .eq('user_id', user_id)
    .eq('scope', 'global')
    .order('generated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2);

  const latest = snapshots?.[0] ?? null;
  const prev = snapshots?.[1] ?? null;

  // Global pulses for Shifts + Timeline (newest first, cap 5 for list; use more for timeline if needed)
  const { data: pulseRows } = await supabaseClient
    .from('pulse')
    .select('id, pulse_type, headline, state_hash, occurred_at, project_id')
    .eq('user_id', user_id)
    .eq('scope', 'global')
    .in('pulse_type', [...PULSE_TYPES_FOR_LANDING])
    .order('occurred_at', { ascending: false })
    .limit(20);

  const pulses: HomePulse[] = (pulseRows ?? []).map((row: any) => ({
    id: row.id,
    pulse_type: row.pulse_type ?? '',
    headline: row.headline ?? null,
    state_hash: row.state_hash ?? '',
    occurred_at: row.occurred_at ?? new Date().toISOString(),
    project_id: row.project_id ?? null,
  }));

  const latestStateHash = latest?.state_hash ?? null;
  let semanticDirection: string | null = null;
  let semanticPulseHeadlines: Record<string, string> = {};

  if (latestStateHash) {
    const overlay = await getSemanticOverlay({
      supabaseClient,
      user_id,
      scope_type: 'global',
      scope_id: null,
      state_hash: latestStateHash,
      pulse_id_state_hash_pairs: pulses.map((p) => ({ pulse_id: p.id, state_hash: p.state_hash })),
    });
    semanticDirection = overlay.direction;
    semanticPulseHeadlines = overlay.pulseHeadlines;
  }

  return {
    latestSnapshot: latest
      ? {
          id: latest.id,
          state_hash: latest.state_hash,
          generated_at: latest.generated_at,
          snapshot_text: (latest as any).snapshot_text ?? null,
          state_payload: latest.state_payload as StructuralStatePayload | null,
        }
      : null,
    prevSnapshotPayload: prev?.state_payload
      ? (prev.state_payload as StructuralStatePayload)
      : null,
    pulses,
    semanticDirection,
    semanticPulseHeadlines,
  };
}
