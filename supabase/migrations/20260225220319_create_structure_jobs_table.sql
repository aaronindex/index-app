-- INDEX v2 Structure Jobs Table
-- Creates table for structure recomputation jobs
-- Jobs are user-scoped and support deduplication via debounce_key

-- ============================================================================
-- STRUCTURE_JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS structure_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'user',
  type TEXT NOT NULL DEFAULT 'recompute_structure',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  payload JSONB NOT NULL,
  debounce_key TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT
);

-- Indexes for structure_jobs
CREATE INDEX IF NOT EXISTS idx_structure_jobs_user_status_queued 
  ON structure_jobs(user_id, status, queued_at DESC);

CREATE INDEX IF NOT EXISTS idx_structure_jobs_user_debounce 
  ON structure_jobs(user_id, debounce_key) 
  WHERE debounce_key IS NOT NULL;

-- ============================================================================
-- RLS POLICIES: STRUCTURE_JOBS
-- ============================================================================
-- Direct user_id ownership
-- Users can insert/select their own jobs
-- Updates typically done by service role (processor), but allow user updates for flexibility

ALTER TABLE structure_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own structure jobs"
  ON structure_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own structure jobs"
  ON structure_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own structure jobs"
  ON structure_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Note: Service role (used in processor) bypasses RLS automatically
-- No DELETE policy needed - jobs are not deleted, only marked as succeeded/failed
