-- Create invite_codes table for alpha access gating
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  max_uses INT NOT NULL DEFAULT 5,
  uses INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active codes lookup
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = true;

-- RLS: Allow public SELECT to verify code only (no other public access)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Public can only SELECT to verify code validity (no INSERT/UPDATE/DELETE)
CREATE POLICY "Public can verify invite codes"
  ON invite_codes FOR SELECT
  USING (true);

-- Only service role can manage invite codes (INSERT/UPDATE)
-- This is handled via service role key, not RLS policy

