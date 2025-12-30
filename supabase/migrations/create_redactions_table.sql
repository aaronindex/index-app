-- Create redactions table
-- Redactions are negative signals: content that should be suppressed from resurfacing
-- Similar structure to highlights but with a different semantic meaning

CREATE TABLE IF NOT EXISTS redactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  message_chunk_id UUID REFERENCES message_chunks(id) ON DELETE SET NULL,
  selection_start INT,
  selection_end INT,
  redacted_text TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_redactions_user_id ON redactions(user_id);
CREATE INDEX IF NOT EXISTS idx_redactions_project_id ON redactions(project_id);
CREATE INDEX IF NOT EXISTS idx_redactions_conversation_id ON redactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_redactions_message_id ON redactions(message_id);
CREATE INDEX IF NOT EXISTS idx_redactions_message_chunk_id ON redactions(message_chunk_id);

-- RLS: Mirror highlights policies - owner-only access
ALTER TABLE redactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own redactions" ON redactions;
DROP POLICY IF EXISTS "Users can create their own redactions" ON redactions;
DROP POLICY IF EXISTS "Users can update their own redactions" ON redactions;
DROP POLICY IF EXISTS "Users can delete their own redactions" ON redactions;

CREATE POLICY "Users can view their own redactions"
  ON redactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own redactions"
  ON redactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own redactions"
  ON redactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own redactions"
  ON redactions FOR DELETE
  USING (auth.uid() = user_id);

