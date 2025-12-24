-- Create decisions table if it doesn't exist
-- Decisions are extracted from conversations or manually created by users

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table exists but columns are missing
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Handle summary column: make it nullable if it exists (we use 'content' instead)
-- This handles cases where the table was created with a summary column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' 
    AND column_name = 'summary'
  ) THEN
    -- Make summary nullable if it exists and has NOT NULL constraint
    BEGIN
      ALTER TABLE decisions ALTER COLUMN summary DROP NOT NULL;
    EXCEPTION
      WHEN OTHERS THEN
        -- Column might not have NOT NULL constraint, that's fine
        NULL;
    END;
    -- Set default to NULL if not already
    ALTER TABLE decisions ALTER COLUMN summary SET DEFAULT NULL;
  END IF;
END $$;

-- Make user_id NOT NULL if it's nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' 
    AND column_name = 'user_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE decisions ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Make title NOT NULL if it's nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' 
    AND column_name = 'title' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE decisions ALTER COLUMN title SET NOT NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_conversation_id ON decisions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at);

-- RLS
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can create their own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can update their own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can delete their own decisions" ON decisions;

CREATE POLICY "Users can view their own decisions"
  ON decisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own decisions"
  ON decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decisions"
  ON decisions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decisions"
  ON decisions FOR DELETE
  USING (auth.uid() = user_id);

