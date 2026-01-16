-- Comprehensive fix for 'trial' plan issue
-- This ensures all profiles use 'free' or 'pro' only

-- Step 1: Update any existing 'trial' plans to 'free'
UPDATE public.profiles
SET plan = 'free'
WHERE plan = 'trial' OR plan IS NULL;

-- Step 2: Ensure the trigger function uses 'free' (not 'trial')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, plan, weekly_digest_enabled, time_zone)
  VALUES (
    NEW.id,
    'free',  -- Must be 'free' to match CHECK constraint
    true,
    'America/Denver'
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate inserts
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Verify no 'trial' plans remain
-- (This is a check query - run separately to verify)
-- SELECT id, plan FROM profiles WHERE plan = 'trial';

