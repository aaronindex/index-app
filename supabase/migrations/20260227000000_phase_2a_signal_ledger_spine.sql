-- Phase 2a Signal Ledger Spine
-- Adds minimal ledger spine: status/supersession/origin across decisions, tasks, highlights, project_outcome.
-- Does NOT unify tables.

-- ============================================================================
-- DECISIONS: status, superseded_by_decision_id, closed_at, origin
-- ============================================================================

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS superseded_by_decision_id UUID NULL,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'system';

-- Constrain status to allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'decisions_status_check'
  ) THEN
    ALTER TABLE decisions ADD CONSTRAINT decisions_status_check
      CHECK (status IN ('active', 'closed', 'superseded', 'invalidated'));
  END IF;
END $$;

-- FK for supersession (self-reference)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'decisions' AND constraint_name = 'decisions_superseded_by_decision_id_fkey'
  ) THEN
    ALTER TABLE decisions
      ADD CONSTRAINT decisions_superseded_by_decision_id_fkey
      FOREIGN KEY (superseded_by_decision_id) REFERENCES decisions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(user_id, status);

-- Backfill: is_inactive = true → status = 'closed' (new column default is 'active')
UPDATE decisions SET status = 'closed' WHERE is_inactive = true;

-- ============================================================================
-- TASKS: superseded_by_task_id, origin, attributes
-- ============================================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS superseded_by_task_id UUID NULL,
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS attributes JSONB NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tasks' AND constraint_name = 'tasks_superseded_by_task_id_fkey'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_superseded_by_task_id_fkey
      FOREIGN KEY (superseded_by_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_superseded_by_task_id ON tasks(superseded_by_task_id) WHERE superseded_by_task_id IS NOT NULL;

-- ============================================================================
-- HIGHLIGHTS: origin
-- ============================================================================

ALTER TABLE highlights
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'system';

-- ============================================================================
-- PROJECT_OUTCOME: origin
-- ============================================================================

ALTER TABLE project_outcome
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'user';
