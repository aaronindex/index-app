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
  snapshotText: string | null;
  snapshotGeneratedAt: string | null;
  activeArcs: Array<{
    id: string;
    title: string | null;
    status: string | null;
  }>;
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

  // Load project-scoped snapshots (if any) including editorial text + generated_at
  const { data: snapshots } = await supabaseClient
    .from('snapshot_state')
    .select('state_payload, snapshot_text, generated_at, created_at, project_id')
    .eq('user_id', user_id)
    .eq('scope', 'project')
    .eq('project_id', project_id)
    // Prefer generated_at for ordering, but fall back to created_at deterministically.
    .order('generated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2);

  const latestSnapshotRow = snapshots && snapshots[0] ? snapshots[0] : null;
  const latestSnapshotPayload: StructuralStatePayload | null =
    latestSnapshotRow && latestSnapshotRow.state_payload
      ? (latestSnapshotRow.state_payload as StructuralStatePayload)
      : null;

  const prevSnapshotPayload: StructuralStatePayload | null =
    snapshots && snapshots[1]?.state_payload
      ? (snapshots[1].state_payload as StructuralStatePayload)
      : null;

  const snapshotText: string | null =
    latestSnapshotRow && 'snapshot_text' in latestSnapshotRow
      ? ((latestSnapshotRow as { snapshot_text: string | null }).snapshot_text ?? null)
      : null;

  const snapshotGeneratedAt: string | null =
    latestSnapshotRow && 'generated_at' in latestSnapshotRow
      ? ((latestSnapshotRow as { generated_at?: string | null }).generated_at ?? null)
      : null;

  // Resolve active arcs for this project from snapshot payload + arc tables (read-only)
  let activeArcs: Array<{ id: string; title: string | null; status: string | null }> = [];
  const activeArcIds = latestSnapshotPayload?.active_arc_ids ?? [];
  if (activeArcIds.length > 0) {
    const { data: arcLinks } = await supabaseClient
      .from('arc_project_link')
      .select('arc_id')
      .eq('project_id', project_id)
      .in('arc_id', activeArcIds);

    const linkedArcIds =
      arcLinks?.map((row: { arc_id: string }) => row.arc_id).filter((id) => activeArcIds.includes(id)) ?? [];

    if (linkedArcIds.length > 0) {
      const { data: arcs } = await supabaseClient
        .from('arc')
        .select('id, summary, status')
        .eq('user_id', user_id)
        .in('id', linkedArcIds);

      const arcStatuses = latestSnapshotPayload?.arc_statuses ?? {};
      activeArcs =
        arcs?.map((arc: { id: string; summary: string | null; status: string | null }) => ({
          id: arc.id,
          title: arc.summary,
          status: arcStatuses[arc.id] ?? arc.status ?? null,
        })) ?? [];
    }
  }

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
    snapshotText,
    snapshotGeneratedAt,
    activeArcs,
    timelineEvents,
  };
}

