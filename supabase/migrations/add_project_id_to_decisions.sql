-- Add project_id column to decisions table
-- This allows decisions to be directly linked to projects, similar to tasks

ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);

