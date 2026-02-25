// lib/structure/inference/arcs/arc.upsert.ts
// Idempotent upsert of arcs and arc_project_link rows
// Uses deterministic segment_key for lookup

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ArcSegment } from './arc.segment';
import { computeArcStatus } from './arc.status';

/**
 * Upsert arc and project links
 * 
 * Requirements:
 * - Arc identity derived from segment.segment_key (stored in stable_key)
 * - Use upsert lookup by (user_id, stable_key) for idempotent identification
 * - Upsert must not duplicate rows across runs
 * - arc_project_link: only insert/delete what's needed (no full delete)
 * - summary column remains untouched by inference (editorial-only)
 * 
 * @param supabaseAdminClient - Service role client (bypasses RLS)
 * @param userId - User ID
 * @param scope - Scope (currently only "user")
 * @param segment - Arc segment
 * @param nowIso - Current timestamp (ISO)
 * @returns Arc ID
 */
export async function upsertArcAndLinks(
  supabaseAdminClient: SupabaseClient,
  userId: string,
  scope: "user",
  segment: ArcSegment,
  nowIso: string
): Promise<{ arc_id: string }> {
  // Compute arc status
  const status = computeArcStatus(segment.last_signal_at, nowIso);

  // Determine scope based on project_ids
  const arcScope = segment.project_ids.length > 1 ? 'project_spanning' : 'personal';

  // Look up existing arc by user_id + stable_key
  // stable_key stores deterministic segment_key for structural identity
  const { data: existingArc, error: lookupError } = await supabaseAdminClient
    .from('arc')
    .select('id')
    .eq('user_id', userId)
    .eq('stable_key', segment.segment_key)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`[ArcUpsert] Error looking up arc: ${lookupError.message}`);
  }

  let arcId: string;

  if (existingArc) {
    // Update existing arc
    arcId = existingArc.id;
    
    const { error: updateError } = await supabaseAdminClient
      .from('arc')
      .update({
        status,
        scope: arcScope,
        last_signal_at: segment.last_signal_at,
        stable_key: segment.segment_key, // Keep stable_key for structural identity
        updated_at: new Date().toISOString(),
      })
      .eq('id', arcId);

    if (updateError) {
      throw new Error(`[ArcUpsert] Error updating arc: ${updateError.message}`);
    }
  } else {
    // Insert new arc
    // stable_key stores deterministic segment_key for structural identity
    // summary remains editorial-only and is not modified by inference
    const { data: newArc, error: insertError } = await supabaseAdminClient
      .from('arc')
      .insert({
        user_id: userId,
        status,
        scope: arcScope,
        last_signal_at: segment.last_signal_at,
        stable_key: segment.segment_key, // Store segment_key in stable_key for structural identity
      })
      .select('id')
      .single();

    if (insertError || !newArc) {
      throw new Error(`[ArcUpsert] Error inserting arc: ${insertError?.message || 'Unknown error'}`);
    }

    arcId = newArc.id;
  }

  // Upsert arc_project_link rows deterministically
  // Only insert/delete what's needed to avoid unnecessary write churn
  
  // Fetch existing project_ids for this arc
  const { data: existingLinks, error: fetchError } = await supabaseAdminClient
    .from('arc_project_link')
    .select('project_id')
    .eq('arc_id', arcId);

  if (fetchError) {
    throw new Error(`[ArcUpsert] Error fetching arc_project_link: ${fetchError.message}`);
  }

  // Compute sets for comparison (order project_ids for determinism)
  const existingProjectIds = new Set(
    (existingLinks || []).map(link => link.project_id).sort()
  );
  const newProjectIds = new Set(segment.project_ids.sort());

  // Compute diff: toInsert and toDelete
  const toInsert: string[] = [];
  const toDelete: string[] = [];

  for (const projectId of newProjectIds) {
    if (!existingProjectIds.has(projectId)) {
      toInsert.push(projectId);
    }
  }

  for (const projectId of existingProjectIds) {
    if (!newProjectIds.has(projectId)) {
      toDelete.push(projectId);
    }
  }

  // Insert only new links
  if (toInsert.length > 0) {
    const linkRows = toInsert.map(projectId => ({
      arc_id: arcId,
      project_id: projectId,
      last_linked_at: new Date().toISOString(),
    }));

    const { error: insertLinksError } = await supabaseAdminClient
      .from('arc_project_link')
      .insert(linkRows);

    if (insertLinksError) {
      throw new Error(`[ArcUpsert] Error inserting arc_project_link: ${insertLinksError.message}`);
    }
  }

  // Delete only removed links
  if (toDelete.length > 0) {
    const { error: deleteLinksError } = await supabaseAdminClient
      .from('arc_project_link')
      .delete()
      .eq('arc_id', arcId)
      .in('project_id', toDelete);

    if (deleteLinksError) {
      throw new Error(`[ArcUpsert] Error deleting arc_project_link: ${deleteLinksError.message}`);
    }
  }

  return { arc_id: arcId };
}
