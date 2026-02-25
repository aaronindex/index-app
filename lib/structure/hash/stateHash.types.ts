// lib/structure/hash/stateHash.types.ts
// Structural state payload type for deterministic hash generation
// Represents STRUCTURE ONLY - no editorial text, no UI metadata, no ingestion time

/**
 * Structural state payload
 * Contains normalized structural facts only
 * All timestamps are bucketed, all scores are rounded
 */
export type StructuralStatePayload = {
  active_arc_ids: string[];
  arc_statuses: Record<string, string>;
  arc_last_signal_buckets: Record<string, string>; // bucketed timestamps, not raw

  active_phase_ids: string[];
  phase_statuses: Record<string, string>;
  phase_last_signal_buckets: Record<string, string>; // bucketed timestamps, not raw

  tension_edges: string[];                 // canonical stable ids
  friction_score_buckets: Record<string, number>; // rounded buckets, not raw

  decision_density_bucket: number;
  result_density_bucket: number;

  pulse_types: string[]; // pulse types produced during the inference cycle
};
