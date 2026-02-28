// lib/ui-data/project.load.ts
// Load structural state data for project view
// Read-only, no inference

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectStructuralSignals } from '../structure/signals';
import type { StructuralStatePayload } from '@/lib/structure/hash';

export type ProjectViewData = {
  project: {
    id: string;
    name: string | null;
    thinking_started_at: string | null;
  } | null;
  latestSnapshotPayload: StructuralStatePayload | null;
  prevSnapshotPayload: StructuralStatePayload | null;
  timelineEvents: Array<{
    kind: 'decision' | 'result';
    occurred_at: string;
    project_id: string;
  }>;
};

/**
 * Load project view structural data.
 *
 * - latestSnapshotPayload / prevSnapshotPayload: derived from snapshot_state (scope='project')
 * - timelineEvents: derived from structural signals (filter by project_id, kind in ("decision","result"))
 */
export async function loadProjectView(params: {
  supabaseClient: SupabaseClient;
  user_id: string;
  project_id: string;
}): Promise<ProjectViewData> {
  const { supabaseClient, user_id, project_id } = params;

  // Load project
  const { data: project } = await supabaseClient
    .from('projects')
    .select('id, name, thinking_started_at')
    .eq('id', project_id)
    .eq('user_id', user_id)
    .maybeSingle();

  // Load project-scoped snapshots (if any)
  const { data: snapshots } = await supabaseClient
    .from('snapshot_state')
    .select('state_payload, generated_at, created_at')
    .eq('user_id', user_id)
    .eq('scope', 'project')
    // Prefer generated_at for ordering, but fall back to created_at deterministically.
    .order('generated_at', { ascending: false, nullsLast: true })
    .order('created_at', { ascending: false })
    .limit(2);

  const latestSnapshotPayload: StructuralStatePayload | null =
    snapshots && snapshots[0]?.state_payload
      ? (snapshots[0].state_payload as StructuralStatePayload)
      : null;

  const prevSnapshotPayload: StructuralStatePayload | null =
    snapshots && snapshots[1]?.state_payload
      ? (snapshots[1].state_payload as StructuralStatePayload)
      : null;

  // Load timeline events from structural signals (decision/result only)
  const allSignals = await collectStructuralSignals(supabaseClient, user_id);
  const timelineEvents = allSignals
    .filter(
      (signal) =>
        signal.project_id === project_id &&
        (signal.kind === 'decision' || signal.kind === 'result')
    )
    .map((signal) => ({
      kind: signal.kind as 'decision' | 'result',
      occurred_at: signal.occurred_at,
      project_id: signal.project_id || '',
    }))
    .sort(
      (a, b) =>
        new Date(a.occurred_at).getTime() -
        new Date(b.occurred_at).getTime()
    );

  return {
    project: project
      ? {
          id: project.id,
          name: project.name,
          thinking_started_at: project.thinking_started_at || null,
        }
      : null,
    latestSnapshotPayload,
    prevSnapshotPayload,
    timelineEvents,
  };
}

