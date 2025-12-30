-- Add job tracking fields for durable background job processing
-- E1: Move imports to durable background jobs

-- Add fields to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS last_error text NULL,
ADD COLUMN IF NOT EXISTS step text NOT NULL DEFAULT 'queued',
ADD COLUMN IF NOT EXISTS progress_json jsonb NOT NULL DEFAULT '{}';

-- Add constraint for step values
ALTER TABLE jobs
ADD CONSTRAINT jobs_step_check CHECK (step IN ('queued', 'parse', 'insert_conversations', 'insert_messages', 'chunk_messages', 'embed_chunks', 'finalize'));

-- Add index for job processing (pull queued jobs)
CREATE INDEX IF NOT EXISTS idx_jobs_status_step_created 
  ON jobs(status, step, created_at)
  WHERE status = 'pending' AND step = 'queued';

-- Add index for locked jobs (cleanup stale locks)
CREATE INDEX IF NOT EXISTS idx_jobs_locked_at 
  ON jobs(locked_at)
  WHERE locked_at IS NOT NULL;

-- Add fields to imports table
ALTER TABLE imports
ADD COLUMN IF NOT EXISTS dedupe_hash text NULL,
ADD COLUMN IF NOT EXISTS progress_json jsonb NOT NULL DEFAULT '{}';

-- Add index for deduplication
CREATE INDEX IF NOT EXISTS idx_imports_dedupe_hash 
  ON imports(user_id, dedupe_hash)
  WHERE dedupe_hash IS NOT NULL;

-- Note: RLS policies already exist for jobs and imports (owner-only access)
-- New columns inherit existing RLS policies automatically

