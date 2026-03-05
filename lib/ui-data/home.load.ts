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
 * When overlayClient is provided (e.g. service-role), overlay is read with it to avoid RLS blocking.
 */
export async function loadHomeView(params: {
  supabaseClient: SupabaseClient;
  user_id: string;
  /** If set, used for getSemanticOverlay so overlay read bypasses RLS (server-side only). */
  overlayClient?: SupabaseClient;
}): Promise<HomeViewData> {
  const { supabaseClient, user_id, overlayClient } = params;
  const overlaySupabase = overlayClient ?? supabaseClient;

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
      supabaseClient: overlaySupabase,
      user_id,
      scope_type: 'global',
      scope_id: null,
      state_hash: latestStateHash,
      pulse_id_state_hash_pairs: pulses.map((p) => ({ pulse_id: p.id, state_hash: p.state_hash })),
    });
    semanticDirection = overlay.direction;
    semanticPulseHeadlines = overlay.pulseHeadlines;

    // DEV-ONLY: overlay diagnostics (no payload content; counts and ids only)
    if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')) {
      const directionExists = !!overlay.direction?.trim();
      const directionLength = overlay.direction?.length ?? 0;
      const pulseHeadlineCount = Object.keys(overlay.pulseHeadlines).length;
      const arcTitleCount = Object.keys(overlay.arcTitles).length;
      // eslint-disable-next-line no-console
      console.log('[HomeLoad][Overlay]', {
        state_hash_prefix: latestStateHash.substring(0, 16),
        directionExists,
        directionLength,
        pulseHeadlineCount,
        arcTitleCount,
      });
      if (!semanticDirection) {
        const { count } = await overlaySupabase
          .from('semantic_labels')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
          .eq('scope_type', 'global')
          .is('scope_id', null)
          .eq('object_type', 'direction')
          .eq('object_id', 'current')
          .eq('state_hash', latestStateHash);
        // eslint-disable-next-line no-console
        console.log('[HomeLoad][Direction]', {
          semanticDirectionEmpty: true,
          direction_row_count: count ?? 0,
          state_hash_prefix: latestStateHash.substring(0, 16),
        });
      }
    }
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
