-- Add flag to track if user has created their first project
-- Used for analytics: first_project_created event fires only once per user

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_created_project BOOLEAN DEFAULT FALSE;

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_has_created_project 
ON profiles(has_created_project)
WHERE has_created_project = FALSE;

