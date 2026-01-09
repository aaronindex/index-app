-- Add horizon field to tasks table for time-based grouping
-- Horizon values: 'this_week', 'this_month', 'later', or NULL (default)

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS horizon TEXT CHECK (horizon IN ('this_week', 'this_month', 'later'));

-- Create index for horizon queries
CREATE INDEX IF NOT EXISTS idx_tasks_horizon ON tasks(horizon) WHERE horizon IS NOT NULL;

