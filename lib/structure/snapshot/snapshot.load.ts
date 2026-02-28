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

function isDevEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
  );
}

/**
 * Dev-only assertion to ensure snapshot timestamps are present and monotonic inputs exist.
 * Does not mutate data or throw in production.
 */
function devAssertSnapshotTimestamps(row: {
  id: string;
  generated_at?: string | null;
  created_at?: string | null;
}, context: string): void {
  if (!isDevEnv()) return;

  if (!row.generated_at) {
    // Snapshot rows created by the processor should always set generated_at.
    // Older/legacy rows may be missing this; we surface a warning with a reason code.
    // eslint-disable-next-line no-console
    console.warn('[SnapshotMonotonicity][MissingGeneratedAt]', {
      context,
      snapshot_id: row.id,
      reason: 'generated_at_null',
      has_created_at: !!row.created_at,
    });
  }
}

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
    // Select timestamps so we can assert monotonicity and provide a safe fallback.
    .select('id, state_hash, state_payload, generated_at, created_at')
    .eq('user_id', userId)
    .eq('scope', snapshotScope)
    // Prefer generated_at for ordering, but fall back to created_at deterministically.
    .order('generated_at', { ascending: false, nullsLast: true })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`[SnapshotLoad] Error loading latest snapshot: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  devAssertSnapshotTimestamps(
    {
      id: data.id,
      // @ts-expect-error generated_at may not be selected in older schemas
      generated_at: (data as any).generated_at ?? null,
      // @ts-expect-error created_at may not be selected in older schemas
      created_at: (data as any).created_at ?? null,
    },
    'loadLatestSnapshot'
  );

  return {
    id: data.id,
    state_hash: data.state_hash,
    state_payload: data.state_payload as StructuralStatePayload | null,
  };
}
