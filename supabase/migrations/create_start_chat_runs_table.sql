-- Create start_chat_runs table to track Start Chat lifecycle
-- Start Chat is an escape hatch for external AI reasoning, not a chat interface

CREATE TABLE IF NOT EXISTS start_chat_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  origin_type TEXT NOT NULL CHECK (origin_type IN ('project', 'task', 'decision')),
  origin_id UUID, -- References tasks.id or decisions.id when origin_type is 'task' or 'decision'
  target_tool TEXT NOT NULL CHECK (target_tool IN ('chatgpt', 'claude', 'cursor', 'other')),
  intent TEXT, -- Required for project-level runs, optional for task/decision
  prompt_text TEXT NOT NULL, -- Generated Continuity Packet / prompt
  context_refs JSONB, -- Array of {type, id, score} objects used in compilation
  status TEXT DEFAULT 'drafted' CHECK (status IN ('drafted', 'copied', 'harvested', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_start_chat_runs_user_id ON start_chat_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_start_chat_runs_project_id ON start_chat_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_start_chat_runs_origin ON start_chat_runs(origin_type, origin_id);
CREATE INDEX IF NOT EXISTS idx_start_chat_runs_status ON start_chat_runs(status);

-- RLS
ALTER TABLE start_chat_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own start chat runs"
  ON start_chat_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own start chat runs"
  ON start_chat_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own start chat runs"
  ON start_chat_runs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own start chat runs"
  ON start_chat_runs FOR DELETE
  USING (auth.uid() = user_id);

