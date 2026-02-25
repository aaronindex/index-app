-- INDEX v2 Structure Jobs RLS Hardening
-- Removes UPDATE policy for authenticated users
-- Only service role (processor) can update job rows

-- ============================================================================
-- RLS POLICY HARDENING: STRUCTURE_JOBS
-- ============================================================================
-- Users can INSERT and SELECT their own jobs
-- Users CANNOT UPDATE job rows (only service role can update via processor)
-- No DELETE policy (deny by default)

-- Ensure RLS is enabled
ALTER TABLE structure_jobs ENABLE ROW LEVEL SECURITY;

-- Drop the existing UPDATE policy that allows users to update their own jobs
DROP POLICY IF EXISTS "Users can update their own structure jobs" ON structure_jobs;

-- Note: SELECT and INSERT policies remain unchanged:
-- - "Users can view their own structure jobs" (SELECT)
-- - "Users can create their own structure jobs" (INSERT)
--
-- Service role (used in processor) bypasses RLS automatically
-- Processor updates will work via service role, not via RLS policy
