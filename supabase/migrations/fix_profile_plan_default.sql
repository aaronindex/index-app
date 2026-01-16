-- Fix profile trigger to use 'free' instead of 'trial'
-- The billing schema only allows 'free' or 'pro', so 'trial' causes constraint violations

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, plan, weekly_digest_enabled, time_zone)
  VALUES (
    NEW.id,
    'free',  -- Changed from 'trial' to 'free' to match billing schema
    true,
    'America/Denver'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update any existing 'trial' plans to 'free'
UPDATE public.profiles
SET plan = 'free'
WHERE plan = 'trial';

