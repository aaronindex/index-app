// lib/ui-data/project.load.ts
// Load structural state data for project view
// Read-only, no inference

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectStructuralSignals } from '../structure/signals';

export type ProjectViewData = {
  project: {
    id: string;
    name: string | null;
    thinking_started_at: string | null;
  } | null;
  timelineEvents: Array<{
    kind: 'decision' | 'result';
    occurred_at: string;
    project_id: string;
  }>;
  arcs: Array<{
    id: string;
    status: string;
    last_signal_at: string;
  }>;
  phasesByArc: Record<string, Array<{
    id: string;
    status: string;
    last_signal_at: string;
  }>>;
};

/**
 * Load project view structural data
 * 
 * Implementation:
 * - timelineEvents: derived from structural signals (filter by project_id, kind in ("decision","result"))
 * - arcs: from arc_project_link join (select arcs linked to project_id)
 * - phasesByArc: fetch phases where arc_id in arcs, group in code
 * 
 * @param params - Load parameters
 * @returns Project view data
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

  // Load timeline events from structural signals
  // Use collectStructuralSignals and filter for project_id and kind in ("decision","result")
  const allSignals = await collectStructuralSignals(supabaseClient, user_id);
  const timelineEvents = allSignals
    .filter(signal => 
      signal.project_id === project_id && 
      (signal.kind === 'decision' || signal.kind === 'result')
    )
    .map(signal => ({
      kind: signal.kind as 'decision' | 'result',
      occurred_at: signal.occurred_at,
      project_id: signal.project_id || '',
    }))
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  // Load arcs linked to this project via arc_project_link
  const { data: arcLinks } = await supabaseClient
    .from('arc_project_link')
    .select('arc_id')
    .eq('project_id', project_id);

  const arcIds = arcLinks?.map(link => link.arc_id) || [];

  let arcs: Array<{ id: string; status: string; last_signal_at: string }> = [];
  if (arcIds.length > 0) {
    const { data: projectArcs } = await supabaseClient
      .from('arc')
      .select('id, status, last_signal_at')
      .in('id', arcIds)
      .eq('user_id', user_id)
      .order('last_signal_at', { ascending: false })
      .limit(10);

    arcs = projectArcs || [];
  }

  // Load phases for these arcs
  const phasesByArc: Record<string, Array<{ id: string; status: string; last_signal_at: string }>> = {};
  
  if (arcs.length > 0) {
    const arcIdsForPhases = arcs.map(a => a.id);
    const { data: phases } = await supabaseClient
      .from('phase')
      .select('id, arc_id, status, last_signal_at')
      .in('arc_id', arcIdsForPhases)
      .order('last_signal_at', { ascending: false });

    // Group phases by arc_id
    for (const phase of phases || []) {
      if (!phasesByArc[phase.arc_id]) {
        phasesByArc[phase.arc_id] = [];
      }
      phasesByArc[phase.arc_id].push({
        id: phase.id,
        status: phase.status,
        last_signal_at: phase.last_signal_at || '',
      });
    }
  }

  return {
    project: project ? {
      id: project.id,
      name: project.name,
      thinking_started_at: project.thinking_started_at || null,
    } : null,
    timelineEvents,
    arcs,
    phasesByArc,
  };
}
