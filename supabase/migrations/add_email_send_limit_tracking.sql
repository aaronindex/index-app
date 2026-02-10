-- Add email send limit tracking to profiles table
-- Tracks email sends per 24 hours for rate limiting

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_send_count_24h INT DEFAULT 0;

-- Note: Reset logic is handled in application code (lib/limits.ts) when checking limits
-- Uses existing limits_reset_at column for 24-hour window tracking
