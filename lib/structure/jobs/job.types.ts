// lib/structure/jobs/job.types.ts
// Structure job type definitions

/**
 * Structure job scope
 * Minimal for now - only user-level
 */
export type StructureScope = "user";

/**
 * Structure job type
 * Currently only recompute_structure
 */
export type StructureJobType =
  | "recompute_structure";

/**
 * Structure job status
 */
export type StructureJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

/**
 * Structure job payload
 */
export type StructureJobPayload = {
  scope: StructureScope;
  user_id: string;
  reason:
    | "ingestion"
    | "decision_change"
    | "manual"
    | "backfill";
  debounce_key?: string; // used for dedupe
};

/**
 * Structure job row (database representation)
 */
export type StructureJobRow = {
  id: string;
  user_id: string;
  scope: string;
  type: string;
  status: string;
  payload: StructureJobPayload;
  debounce_key: string | null;
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
};
