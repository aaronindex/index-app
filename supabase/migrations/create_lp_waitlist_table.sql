-- Create lp_waitlist table for early access email signups
-- This table stores email addresses from signed-out users who want updates

CREATE TABLE IF NOT EXISTS lp_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'signed_out_lp',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz NULL,
  last_sent_at timestamptz NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_lp_waitlist_email ON lp_waitlist(email);

-- Create index on source for analytics
CREATE INDEX IF NOT EXISTS idx_lp_waitlist_source ON lp_waitlist(source);

-- Enable Row Level Security
ALTER TABLE lp_waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to INSERT (for signup)
-- Only allow inserting email and source fields
CREATE POLICY "Allow anonymous insert for waitlist signup"
  ON lp_waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Block all SELECT from client (only service role can read)
-- This ensures privacy - no one can query the waitlist from client
CREATE POLICY "Block all client selects"
  ON lp_waitlist
  FOR SELECT
  TO anon
  USING (false);

-- Policy: Block all UPDATE from client (only service role can update)
CREATE POLICY "Block all client updates"
  ON lp_waitlist
  FOR UPDATE
  TO anon
  USING (false);

-- Policy: Block all DELETE from client (only service role can delete)
CREATE POLICY "Block all client deletes"
  ON lp_waitlist
  FOR DELETE
  TO anon
  USING (false);

-- Note: Service role (used in API routes) bypasses RLS automatically
-- So the API route can INSERT, UPDATE, and SELECT as needed

