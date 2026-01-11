-- Add lifecycle email tracking fields to profiles table
-- These track when welcome and nudge emails have been sent

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS no_import_nudge_sent_at timestamptz NULL;

-- Index for efficient querying of users eligible for nudge emails
-- Helps with the cron job that finds users with no imports after X days
CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle_emails 
ON profiles(welcome_email_sent_at, no_import_nudge_sent_at, created_at)
WHERE welcome_email_sent_at IS NOT NULL AND no_import_nudge_sent_at IS NULL;

