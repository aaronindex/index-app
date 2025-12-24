-- Add new fields for Weekly Digest v2 (A5)
-- These fields support multi-section narrative structure

ALTER TABLE weekly_digests
ADD COLUMN IF NOT EXISTS what_changed JSONB,
ADD COLUMN IF NOT EXISTS recommended_next_steps JSONB;

-- what_changed structure:
-- {
--   "conversations": number,
--   "highlights": number,
--   "tasks": number,
--   "decisions": number,
--   "narrative": "text description"
-- }

-- recommended_next_steps structure:
-- [
--   {
--     "action": "specific action item",
--     "reason": "why this matters",
--     "priority": "high|medium|low"
--   },
--   ...
-- ]

