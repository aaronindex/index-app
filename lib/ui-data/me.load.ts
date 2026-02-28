// lib/ui-data/me.load.ts
// Load structural state data for Me container view
// Read-only, no inference. Uses global snapshot (no scope='me' in snapshot_state); timeline filtered to Me-scoped events (no project_id).

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectStructuralSignals } from '../structure/signals';
import type { StructuralStatePayload } from '@/lib/structure/hash';

export type MeViewData = {
  latestSnapshotPayload: StructuralStatePayload | null;
  prevSnapshotPayload: StructuralStatePayload | null;
  timelineEvents: Array<{
    kind: 'decision' | 'result';
    occurred_at: string;
  }>;
};

/**
 * Load Me view data.
 *
 * - Snapshot: scope='me' does not exist in snapshot_state; we use global scope
 *   so Direction/Shifts for Me are the user-level (global) structural state.
 * - Timeline: from structural signals, filtered to Me container = signals with
 *   no project_id. Ordered by occurred_at (thinking time).
 */
export async function loadMeView(params: {
  supabaseClient: SupabaseClient;
  user_id: string;
}): Promise<MeViewData> {
  const { supabaseClient, user_id } = params;

  const { data: snapshots } = await supabaseClient
    .from('snapshot_state')
    .select('state_payload, generated_at, created_at')
    .eq('user_id', user_id)
    .eq('scope', 'global')
    // Prefer generated_at for ordering, but fall back to created_at deterministically.
    .order('generated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2);

  const latestSnapshotPayload: StructuralStatePayload | null =
    snapshots?.[0]?.state_payload != null
      ? (snapshots[0].state_payload as StructuralStatePayload)
      : null;

  const prevSnapshotPayload: StructuralStatePayload | null =
    snapshots?.[1]?.state_payload != null
      ? (snapshots[1].state_payload as StructuralStatePayload)
      : null;

  const allSignals = await collectStructuralSignals(supabaseClient, user_id);
  const timelineEvents = allSignals
    .filter(
      (signal) =>
        (signal.kind === 'decision' || signal.kind === 'result') &&
        (signal.project_id == null || signal.project_id === '')
    )
    .map((signal) => ({
      kind: signal.kind as 'decision' | 'result',
      occurred_at: signal.occurred_at,
    }))
    .sort(
      (a, b) =>
        new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );

  return {
    latestSnapshotPayload,
    prevSnapshotPayload,
    timelineEvents,
  };
}
