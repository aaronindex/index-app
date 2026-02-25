-- INDEX v2 Phase Stable Key Migration
-- Adds structural identity column to phase table
-- Separates structural identity from editorial fields (summary)

-- ============================================================================
-- ADD STABLE_KEY COLUMN
-- ============================================================================

ALTER TABLE public.phase
ADD COLUMN IF NOT EXISTS stable_key text;

-- ============================================================================
-- ADD INDEX FOR LOOKUP
-- ============================================================================

CREATE INDEX IF NOT EXISTS phase_arc_stable_key_idx
ON public.phase(arc_id, stable_key);

-- ============================================================================
-- NOTES
-- ============================================================================
-- stable_key stores deterministic phase_key for structural identity
-- summary remains editorial-only and is not modified by inference
-- Lookup uses (arc_id, stable_key) for idempotent phase identification
