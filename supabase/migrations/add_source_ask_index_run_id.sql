-- Add source_ask_index_run_id columns to tasks, decisions, and highlights
-- This links created objects back to the Ask Index run that generated them

-- Add to tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS source_ask_index_run_id UUID REFERENCES ask_index_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_source_ask_index_run_id ON tasks(source_ask_index_run_id);

-- Add to decisions
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS source_ask_index_run_id UUID REFERENCES ask_index_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_source_ask_index_run_id ON decisions(source_ask_index_run_id);

-- Add to highlights
ALTER TABLE highlights
ADD COLUMN IF NOT EXISTS source_ask_index_run_id UUID REFERENCES ask_index_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_highlights_source_ask_index_run_id ON highlights(source_ask_index_run_id);
