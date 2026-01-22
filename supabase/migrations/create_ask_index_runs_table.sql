-- Create ask_index_runs table to track Ask Index queries and conversions
-- This enables server-truth tracking of Ask runs → created objects

CREATE TABLE IF NOT EXISTS ask_index_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scope TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  query_hash TEXT NOT NULL,
  query_length INT NOT NULL,
  result_count INT NOT NULL,
  top_score DOUBLE PRECISION,
  threshold DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  latency_ms INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'no_results', 'error')),
  model TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ask_index_runs_user_id ON ask_index_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_ask_index_runs_created_at ON ask_index_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_ask_index_runs_query_hash ON ask_index_runs(query_hash);

-- RLS
ALTER TABLE ask_index_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ask_index_runs"
  ON ask_index_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ask_index_runs"
  ON ask_index_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
