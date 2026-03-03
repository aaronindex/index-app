// lib/structure/dispatch/dispatch.types.ts
// Dispatch types for structure recomputation triggers

import type { StructureScope } from '../jobs';

/**
 * Structure recompute reason
 */
export type StructureRecomputeReason =
  | "ingestion"
  | "decision_change"
  | "manual"
  | "outcome_recorded";

/**
 * Dispatch parameters
 */
export type DispatchStructureRecomputeParams = {
  supabaseClient: any; // Supabase client (user-scoped or service role)
  user_id: string;
  scope: StructureScope;
  // Optional project context for project-scoped recompute
  project_id?: string;
  reason: StructureRecomputeReason;
  debounce_key?: string;
};
