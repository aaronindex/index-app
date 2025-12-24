-- Add content column to decisions table if it doesn't exist
-- This column stores the details/context of a decision

ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS content TEXT;

