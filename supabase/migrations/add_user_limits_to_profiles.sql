-- Add user limit tracking fields to profiles table
-- These track usage in the last 24 hours for free-user limits
-- Reset logic is handled in application code (lib/limits.ts) when checking limits

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS import_count_24h INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ask_count_24h INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS meaning_objects_24h INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS limits_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Index for efficient limit checks
CREATE INDEX IF NOT EXISTS idx_profiles_limits_reset ON profiles(limits_reset_at);

