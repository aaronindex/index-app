-- INDEX v2 Snapshot State Payload Migration
-- Adds state_payload column to persist normalized structural payload
-- Enables pulse diff computation and structure evolution debugging

-- ============================================================================
-- ADD STATE_PAYLOAD COLUMN
-- ============================================================================

ALTER TABLE public.snapshot_state
ADD COLUMN IF NOT EXISTS state_payload jsonb NULL;

-- ============================================================================
-- NOTES
-- ============================================================================
-- state_payload stores normalized StructuralStatePayload JSON
-- Used for:
-- - Computing pulse diffs (comparing prevPayload vs newPayload)
-- - Debugging structure evolution
-- - Keeping system calm and explainable
-- 
-- No index required yet (may add later if needed for queries)
