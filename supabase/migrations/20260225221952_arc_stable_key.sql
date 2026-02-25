-- INDEX v2 Arc Stable Key Migration
-- Adds structural identity column to arc table
-- Separates structural identity from editorial fields (summary)

-- ============================================================================
-- ADD STABLE_KEY COLUMN
-- ============================================================================

ALTER TABLE public.arc
ADD COLUMN IF NOT EXISTS stable_key text;

-- ============================================================================
-- ADD INDEX FOR LOOKUP
-- ============================================================================

CREATE INDEX IF NOT EXISTS arc_user_stable_key_idx
ON public.arc(user_id, stable_key);

-- ============================================================================
-- NOTES
-- ============================================================================
-- stable_key stores deterministic segment_key for structural identity
-- summary remains editorial-only and is not modified by inference
-- Lookup uses (user_id, stable_key) for idempotent arc identification
