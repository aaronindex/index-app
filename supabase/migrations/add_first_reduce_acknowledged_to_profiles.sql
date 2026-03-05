-- First structural moment: show "Signals extracted" overlay once per account after first Reduce.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_reduce_acknowledged BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.first_reduce_acknowledged IS 'When true, user has dismissed the first Reduce confirmation overlay.';
