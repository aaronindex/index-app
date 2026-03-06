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

async function generateSnapshotText(params: {
  supabaseAdminClient: SupabaseClient;
  userId: string;
  payload: StructuralStatePayload;
}): Promise<string | null> {
  const { supabaseAdminClient, userId, payload } = params;

  const lines: string[] = [];

  const activeArcIds = Array.isArray(payload.active_arc_ids)
    ? payload.active_arc_ids
    : [];

  let arcSummaries: string[] = [];
  if (activeArcIds.length > 0) {
    try {
      const { data: arcs } = await supabaseAdminClient
        .from('arc')
        .select('id, summary')
        .eq('user_id', userId)
        .in('id', activeArcIds);

      arcSummaries =
        arcs
          ?.map((arc: { id: string; summary: string | null }) => arc.summary || null)
          .filter((s): s is string => !!s && s.trim().length > 0) ?? [];
    } catch {
      // If arc lookup fails, fall back to counts only.
      arcSummaries = [];
    }
  }

  const arcCount = activeArcIds.length;
  if (arcCount === 0) {
    lines.push('No distinct patterns yet. Structure is still forming.');
  } else {
    if (arcSummaries.length > 0) {
      const joined =
        arcSummaries.length > 2
          ? `${arcSummaries.slice(0, 2).join(', ')}${
              arcSummaries.length > 2 ? ', …' : ''
            }`
          : arcSummaries.join(', ');
      lines.push(`Current focus: ${joined}.`);
    } else {
      lines.push(
        arcCount === 1
          ? 'Current activity remains concentrated in one area.'
          : 'Work is taking shape across a few areas.'
      );
    }
  }

  const text = lines.join('\n').trim();
  return text.length > 0 ? text : null;
}

/**
 * Dev-only assertion to ensure generated_at is present on snapshot rows written by the processor.
 * Does not mutate data or throw in production.
 */
function devAssertSnapshotWriteTimestamps(row: {
  id: string;
  generated_at?: string | null;
}, context: string): void {
  if (!isDevEnv()) return;

  if (!row.generated_at) {
    // eslint-disable-next-line no-console
    console.warn('[SnapshotMonotonicity][MissingGeneratedAtAfterWrite]', {
      context,
      snapshot_id: row.id,
      reason: 'generated_at_null_after_insert',
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
  payload: StructuralStatePayload,
  projectId?: string | null
): Promise<{ snapshot_id: string }> {
  const snapshotScope = mapScopeToSnapshotScope(scope);

  // Normalize payload before storage to ensure stability
  const normalizedPayload = normalizeStructuralState(payload);

  // Dev-only deterministic ordering checks (non-mutating, logs only).
  devAssertDeterministicStructuralPayload(normalizedPayload, 'writeSnapshotState');

  let snapshotText: string | null = null;
  try {
    snapshotText = await generateSnapshotText({
      supabaseAdminClient,
      userId,
      payload: normalizedPayload,
    });
  } catch {
    snapshotText = null;
  }

  const { data, error } = await supabaseAdminClient
    .from('snapshot_state')
    .insert({
      user_id: userId,
      scope: snapshotScope,
      project_id: snapshotScope === 'project' ? (projectId ?? null) : null,
      state_hash: stateHash,
      state_payload: normalizedPayload as any, // Store as JSONB
      generated_at: new Date().toISOString(),
      snapshot_text: snapshotText,
      // field_note_text remains null (editorial-only, not set by inference)
    })
    .select('id, generated_at')
    .single();

  if (error || !data) {
    if (isDevEnv()) {
      // eslint-disable-next-line no-console
      console.error('[SnapshotWrite][InsertFailed]', {
        user_id: userId,
        scope: snapshotScope,
        state_hash_prefix: stateHash?.substring(0, 24),
        error_message: error?.message,
        error_code: error?.code,
        error_details: error?.details,
      });
    }
    throw new Error(`[SnapshotWrite] Error writing snapshot: ${error?.message || 'Unknown error'}`);
  }

  devAssertSnapshotWriteTimestamps(
    {
      id: data.id,
      generated_at: (data as { generated_at?: string | null }).generated_at ?? null,
    },
    'writeSnapshotState'
  );

  return { snapshot_id: data.id };
}
