// lib/structure/snapshot/snapshot.load.ts
// Load latest snapshot_state for hash comparison

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuralStatePayload } from '../hash';

/**
 * Latest snapshot result
 */
export type LatestSnapshot = {
  id: string;
  state_hash: string;
  state_payload: StructuralStatePayload | null;
} | null;

/**
 * Map structure scope to snapshot scope
 * Structure jobs use "user" scope, which maps to "global" in snapshot_state
 */
function mapScopeToSnapshotScope(scope: string): 'project' | 'global' {
  if (scope === 'user') {
    return 'global';
  }
  return scope as 'project' | 'global';
}

/**
 * Load latest snapshot_state for user/scope
 * 
 * Query snapshot_state ordered by generated_at DESC limit 1.
 * 
 * @param supabaseAdminClient - Service role client (bypasses RLS)
 * @param userId - User ID
 * @param scope - Structure scope (e.g., "user")
 * @returns Latest snapshot with state_hash, id, and state_payload, or null if none exists
 */
export async function loadLatestSnapshot(
  supabaseAdminClient: SupabaseClient,
  userId: string,
  scope: string
): Promise<LatestSnapshot> {
  const snapshotScope = mapScopeToSnapshotScope(scope);

  const { data, error } = await supabaseAdminClient
    .from('snapshot_state')
    .select('id, state_hash, state_payload')
    .eq('user_id', userId)
    .eq('scope', snapshotScope)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`[SnapshotLoad] Error loading latest snapshot: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    state_hash: data.state_hash,
    state_payload: data.state_payload as StructuralStatePayload | null,
  };
}
