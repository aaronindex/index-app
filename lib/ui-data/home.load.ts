// lib/ui-data/home.load.ts
// Load structural state data for homepage view
// Read-only, no inference

import type { SupabaseClient } from '@supabase/supabase-js';

export type HomeViewData = {
  latestSnapshot: {
    id: string;
    state_hash: string;
    generated_at: string;
    state_payload: any;
  } | null;
  activeArcs: Array<{
    id: string;
    status: string;
    last_signal_at: string;
  }>;
  activePhases: Array<{
    id: string;
    arc_id: string;
    status: string;
    last_signal_at: string;
  }>;
  recentPulses: Array<{
    id: string;
    type: string;
    occurred_at: string;
  }>;
};

/**
 * Load home view structural data
 * 
 * Queries:
 * - latest snapshot_state (order by generated_at desc limit 1)
 * - arcs where status = active (order by last_signal_at desc limit 10)
 * - phases where status = active (order by last_signal_at desc limit 20)
 * - pulses (order by occurred_at desc limit 10)
 * 
 * @param params - Load parameters
 * @returns Home view data
 */
export async function loadHomeView(params: {
  supabaseClient: SupabaseClient;
  user_id: string;
}): Promise<HomeViewData> {
  const { supabaseClient, user_id } = params;

  // Load latest snapshot
  const { data: latestSnapshot } = await supabaseClient
    .from('snapshot_state')
    .select('id, state_hash, generated_at, state_payload')
    .eq('user_id', user_id)
    .eq('scope', 'global')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Load active arcs
  const { data: activeArcs } = await supabaseClient
    .from('arc')
    .select('id, status, last_signal_at')
    .eq('user_id', user_id)
    .eq('status', 'active')
    .order('last_signal_at', { ascending: false })
    .limit(10);

  // Load active phases
  // First get active arc IDs
  const activeArcIds = activeArcs?.map(a => a.id) || [];
  
  let activePhases: Array<{ id: string; arc_id: string; status: string; last_signal_at: string }> = [];
  if (activeArcIds.length > 0) {
    const { data: phases } = await supabaseClient
      .from('phase')
      .select('id, arc_id, status, last_signal_at')
      .in('arc_id', activeArcIds)
      .eq('status', 'active') // Schema uses 'active' or 'dormant', we want active phases
      .order('last_signal_at', { ascending: false })
      .limit(20);
    
    activePhases = (phases || []).map(p => ({
      id: p.id,
      arc_id: p.arc_id,
      status: p.status,
      last_signal_at: p.last_signal_at || '',
    }));
  }

  // Load recent pulses
  const { data: recentPulses } = await supabaseClient
    .from('pulse')
    .select('id, pulse_type, occurred_at')
    .eq('user_id', user_id)
    .eq('scope', 'global')
    .order('occurred_at', { ascending: false })
    .limit(10);

  return {
    latestSnapshot: latestSnapshot ? {
      id: latestSnapshot.id,
      state_hash: latestSnapshot.state_hash,
      generated_at: latestSnapshot.generated_at,
      state_payload: latestSnapshot.state_payload,
    } : null,
    activeArcs: activeArcs || [],
    activePhases: activePhases.map(p => ({
      id: p.id,
      arc_id: p.arc_id,
      status: p.status,
      last_signal_at: p.last_signal_at || '',
    })),
    recentPulses: (recentPulses || []).map(p => ({
      id: p.id,
      type: p.pulse_type,
      occurred_at: p.occurred_at,
    })),
  };
}
