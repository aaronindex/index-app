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
  projectSnapshots: Array<{
    id: string;
    generated_at: string | null;
    created_at: string | null;
    snapshot_text: string | null;
    state_payload: StructuralStatePayload | null;
  }>;
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

  // Load project-scoped snapshot history (capped) including editorial text + timestamps
  const { data: snapshots } = await supabaseClient
    .from('snapshot_state')
    .select('id, state_payload, snapshot_text, generated_at, created_at, project_id')
    .eq('user_id', user_id)
    .eq('scope', 'project')
    .eq('project_id', project_id)
    // Oldest → newest for stable left-to-right timeline spacing.
    .order('generated_at', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(60);

  // Snapshot history for UI (horizontal timeline)
  const projectSnapshots =
    snapshots?.map((row: any) => ({
      id: row.id as string,
      generated_at: (row.generated_at as string | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
      snapshot_text: (row.snapshot_text as string | null) ?? null,
      state_payload: (row.state_payload as StructuralStatePayload | null) ?? null,
    })) ?? [];

  // Latest / previous payloads for existing consumers (derive from history)
  const latestSnapshotRow =
    snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const latestSnapshotPayload: StructuralStatePayload | null =
    latestSnapshotRow && latestSnapshotRow.state_payload
      ? (latestSnapshotRow.state_payload as StructuralStatePayload)
      : null;

  const prevSnapshotPayload: StructuralStatePayload | null =
    snapshots && snapshots.length > 1 && snapshots[snapshots.length - 2]?.state_payload
      ? (snapshots[snapshots.length - 2].state_payload as StructuralStatePayload)
      : null;

  const snapshotGeneratedAt: string | null =
    latestSnapshotRow && ('generated_at' in latestSnapshotRow || 'created_at' in latestSnapshotRow)
      ? ((latestSnapshotRow as { generated_at?: string | null; created_at?: string | null }).generated_at ??
          (latestSnapshotRow as { generated_at?: string | null; created_at?: string | null }).created_at ??
          null)
      : null;

  const snapshotText: string | null =
    latestSnapshotRow && 'snapshot_text' in latestSnapshotRow
      ? ((latestSnapshotRow as { snapshot_text: string | null }).snapshot_text ?? null)
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

