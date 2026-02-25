// lib/structure/dispatch/dispatch.types.ts
// Dispatch types for structure recomputation triggers

/**
 * Structure recompute reason
 */
export type StructureRecomputeReason =
  | "ingestion"
  | "decision_change"
  | "manual";

/**
 * Dispatch parameters
 */
export type DispatchStructureRecomputeParams = {
  supabaseClient: any; // Supabase client (user-scoped or service role)
  user_id: string;
  scope: "user";
  reason: StructureRecomputeReason;
  debounce_key?: string;
};
