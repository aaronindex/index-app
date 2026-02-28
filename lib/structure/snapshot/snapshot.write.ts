// lib/structure/snapshot/snapshot.write.ts
// Write new snapshot_state row

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuralStatePayload } from '../hash';
import { normalizeStructuralState } from '../hash';
import { devAssertDeterministicStructuralPayload } from '../hash/stateHash.assertions';

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

function isDevEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
  );
}

/**
 * Dev-only assertion to ensure generated_at is present on snapshot rows written by the processor.
 * Does not mutate data or throw in production.
 */
function devAssertSnapshotWriteTimestamps(row: {
  id: string;
  generated_at?: string | null;
  created_at?: string | null;
}, context: string): void {
  if (!isDevEnv()) return;

  if (!row.generated_at) {
    // eslint-disable-next-line no-console
    console.warn('[SnapshotMonotonicity][MissingGeneratedAtAfterWrite]', {
      context,
      snapshot_id: row.id,
      reason: 'generated_at_null_after_insert',
      has_created_at: !!row.created_at,
    });
  }
}

/**
 * Write new snapshot_state row
 * 
 * Creates minimal snapshot row with:
 * - user_id
 * - scope (mapped from structure scope)
 * - state_hash
 * - state_payload (normalized structural payload)
 * - generated_at = now()
 * 
 * NO editorial text fields yet (snapshot_text, field_note_text remain null).
 * 
 * Important: state_payload is stored as normalized payload (after normalizeStructuralState)
 * so later reads are stable and deterministic.
 * 
 * @param supabaseAdminClient - Service role client (bypasses RLS)
 * @param userId - User ID
 * @param scope - Structure scope (e.g., "user")
 * @param stateHash - Computed state hash
 * @param payload - Structural state payload (will be normalized before storage)
 * @returns Snapshot ID
 */
export async function writeSnapshotState(
  supabaseAdminClient: SupabaseClient,
  userId: string,
  scope: string,
  stateHash: string,
  payload: StructuralStatePayload
): Promise<{ snapshot_id: string }> {
  const snapshotScope = mapScopeToSnapshotScope(scope);

  // Normalize payload before storage to ensure stability
  const normalizedPayload = normalizeStructuralState(payload);

  // Dev-only deterministic ordering checks (non-mutating, logs only).
  devAssertDeterministicStructuralPayload(normalizedPayload, 'writeSnapshotState');

  const { data, error } = await supabaseAdminClient
    .from('snapshot_state')
    .insert({
      user_id: userId,
      scope: snapshotScope,
      state_hash: stateHash,
      state_payload: normalizedPayload as any, // Store as JSONB
      generated_at: new Date().toISOString(),
      // snapshot_text and field_note_text remain null (editorial-only, not set by inference)
    })
    // Select timestamps so we can assert monotonicity invariants in development.
    .select('id, generated_at, created_at')
    .single();

  if (error || !data) {
    throw new Error(`[SnapshotWrite] Error writing snapshot: ${error?.message || 'Unknown error'}`);
  }

  devAssertSnapshotWriteTimestamps(
    {
      id: data.id,
      // @ts-expect-error generated_at exists on snapshot_state rows
      generated_at: (data as any).generated_at ?? null,
      // @ts-expect-error created_at exists on snapshot_state rows
      created_at: (data as any).created_at ?? null,
    },
    'writeSnapshotState'
  );

  return { snapshot_id: data.id };
}
