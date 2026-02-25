// lib/structure/inference/phases/phase.upsert.ts
// Idempotent upsert of phase rows
// Uses deterministic phase_key for lookup

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PhaseSegment } from './phase.segment';
import { computePhaseStatus } from './phase.status';

/**
 * Upsert phase
 * 
 * Requirements:
 * - Phase identity derived from phase.segment_key (stored in stable_key)
 * - Use upsert lookup by (arc_id, stable_key) for idempotent identification
 * - Upsert must not duplicate rows across runs
 * - Do NOT write editorial fields (summary remains untouched)
 * 
 * @param supabaseAdminClient - Service role client (bypasses RLS)
 * @param params - Phase upsert parameters
 * @returns Phase ID
 */
export async function upsertPhase(
  supabaseAdminClient: SupabaseClient,
  params: {
    arc_id: string;
    phase_key: string;
    start_at: string;
    end_at: string;
    last_signal_at: string;
    status: "active" | "compressed";
  }
): Promise<{ phase_id: string }> {
  const { arc_id, phase_key, start_at, end_at, last_signal_at, status } = params;

  // Map "compressed" to "dormant" for schema compatibility
  const schemaStatus = status === 'compressed' ? 'dormant' : 'active';

  // Look up existing phase by arc_id + stable_key
  const { data: existingPhase, error: lookupError } = await supabaseAdminClient
    .from('phase')
    .select('id, phase_index')
    .eq('arc_id', arc_id)
    .eq('stable_key', phase_key)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`[PhaseUpsert] Error looking up phase: ${lookupError.message}`);
  }

  let phaseId: string;
  let phaseIndex: number;

  if (existingPhase) {
    // Update existing phase
    phaseId = existingPhase.id;
    phaseIndex = existingPhase.phase_index;

    const { error: updateError } = await supabaseAdminClient
      .from('phase')
      .update({
        status: schemaStatus,
        started_at: start_at,
        last_signal_at: last_signal_at,
        stable_key: phase_key, // Keep stable_key for structural identity
      })
      .eq('id', phaseId);

    if (updateError) {
      throw new Error(`[PhaseUpsert] Error updating phase: ${updateError.message}`);
    }
  } else {
    // Insert new phase
    // Need to determine phase_index (count existing phases for this arc)
    const { data: existingPhases, error: countError } = await supabaseAdminClient
      .from('phase')
      .select('phase_index')
      .eq('arc_id', arc_id)
      .order('phase_index', { ascending: false })
      .limit(1);

    if (countError) {
      throw new Error(`[PhaseUpsert] Error counting phases: ${countError.message}`);
    }

    phaseIndex = existingPhases && existingPhases.length > 0
      ? existingPhases[0].phase_index + 1
      : 0;

    const { data: newPhase, error: insertError } = await supabaseAdminClient
      .from('phase')
      .insert({
        arc_id,
        phase_index: phaseIndex,
        status: schemaStatus,
        started_at: start_at,
        last_signal_at: last_signal_at,
        stable_key: phase_key, // Store phase_key in stable_key for structural identity
      })
      .select('id')
      .single();

    if (insertError || !newPhase) {
      throw new Error(`[PhaseUpsert] Error inserting phase: ${insertError?.message || 'Unknown error'}`);
    }

    phaseId = newPhase.id;
  }

  return { phase_id: phaseId };
}
