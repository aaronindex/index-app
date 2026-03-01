-- Add last_reduce_at to projects for accumulation visibility ("X new captures since last reduce").
-- Reset only when Reduce successfully completes for the project.
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS last_reduce_at TIMESTAMPTZ NULL;
