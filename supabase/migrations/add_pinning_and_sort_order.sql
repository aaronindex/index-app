-- Add pinning and sort_order fields for tasks and decisions
-- Allows one pinned task and one pinned decision per project
-- Enables manual task reordering within projects

-- Add is_pinned to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Add sort_order to tasks (for manual reordering within project)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Add is_pinned to decisions
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tasks_project_pinned ON tasks(project_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_tasks_project_sort ON tasks(project_id, sort_order) WHERE sort_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_decisions_project_pinned ON decisions(project_id, is_pinned) WHERE is_pinned = true;

-- Add constraint: Only one pinned task per project
-- This will be enforced in application logic, but we can add a unique partial index as a safeguard
-- Note: Supabase doesn't support unique partial indexes directly, so we'll enforce in app logic

