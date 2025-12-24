-- Add missing source_highlight_id column to tasks table
-- This column was referenced in code but missing from the table schema

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS source_highlight_id UUID REFERENCES highlights(id) ON DELETE SET NULL;

-- The index already exists from create_tasks_table.sql, so no need to recreate it

