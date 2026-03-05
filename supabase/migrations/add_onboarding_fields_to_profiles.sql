-- Add onboarding state to profiles (v2: show tour on first login, restart from menu).
-- Run in Supabase SQL editor or via migration runner.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_version TEXT DEFAULT 'v2';

COMMENT ON COLUMN profiles.onboarding_completed IS 'When true, onboarding tour has been completed (or skipped).';
COMMENT ON COLUMN profiles.onboarding_version IS 'Onboarding flow version (e.g. v2) for future flow changes.';
