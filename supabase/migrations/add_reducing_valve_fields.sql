-- Add reducing valve fields: is_personal for projects, is_inactive for conversations/tasks/decisions
-- This migration adds the personal/inactive flags to support the "Reducing Valve" layer

-- 1. Add is_personal to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_projects_is_personal ON projects(user_id, is_personal);

-- 2. Add is_inactive to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_inactive BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_conversations_is_inactive ON conversations(user_id, is_inactive);

-- 3. Add is_inactive to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_inactive BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_tasks_is_inactive ON tasks(user_id, is_inactive);

-- 4. Add is_inactive to decisions
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS is_inactive BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_decisions_is_inactive ON decisions(user_id, is_inactive);

