// lib/structure/snapshot/pulse.minimal.ts
// Create minimal pulse records (structural only, no editorial text)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuralStatePayload } from '../hash';

/**
 * Map structure scope to pulse scope
 * Structure jobs use "user" scope, which maps to "global" in pulse
 */
function mapScopeToPulseScope(scope: string): 'project' | 'global' {
  if (scope === 'user') {
    return 'global';
  }
  return scope as 'project' | 'global';
}

/**
 * Compare arrays for equality (sorted)
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Create minimal pulse types based on structural changes
 * 
 * Rules:
 * - IF active_arc_ids changed: pulse_types.push("arc_shift")
 * - IF decision_density_bucket changed: pulse_types.push("density_change")
 * 
 * Do NOT interpret meaning.
 * Do NOT generate text.
 * Just store pulse type rows.
 * 
 * @param supabaseAdminClient - Service role client (bypasses RLS)
 * @param userId - User ID
 * @param scope - Structure scope (e.g., "user")
 * @param prevPayload - Previous structural state payload (null if no previous)
 * @param newPayload - New structural state payload
 * @param stateHash - Current state hash
 * @returns Array of pulse types created
 */
export async function createMinimalPulses(
  supabaseAdminClient: SupabaseClient,
  userId: string,
  scope: string,
  prevPayload: StructuralStatePayload | null,
  newPayload: StructuralStatePayload,
  stateHash: string
): Promise<string[]> {
  const pulseScope = mapScopeToPulseScope(scope);
  const pulseTypes: string[] = [];

  // Treat missing previous as "no prior structure" (e.g. first snapshot after import+distill)
  const prevArcIds = prevPayload?.active_arc_ids ?? [];
  const prevDensity = prevPayload?.decision_density_bucket ?? null;

  // Check if active_arc_ids changed (including first snapshot: [] -> [arcs])
  if (!arraysEqual(prevArcIds, newPayload.active_arc_ids)) {
    pulseTypes.push('arc_shift');
  }

  // Check if decision_density_bucket changed
  if (prevDensity !== newPayload.decision_density_bucket) {
    pulseTypes.push('structural_threshold'); // Use structural_threshold for density changes
  }

  // Create pulse records for each type
  if (pulseTypes.length > 0) {
    const pulseRows = pulseTypes.map(pulseType => ({
      user_id: userId,
      scope: pulseScope,
      pulse_type: pulseType,
      state_hash: stateHash,
      occurred_at: new Date().toISOString(),
      // headline remains null (editorial-only, not set by inference)
    }));

    const { error } = await supabaseAdminClient
      .from('pulse')
      .insert(pulseRows);

    if (error) {
      throw new Error(`[PulseMinimal] Error creating pulses: ${error.message}`);
    }
  }

  return pulseTypes;
}
