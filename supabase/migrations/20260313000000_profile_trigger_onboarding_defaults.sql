-- Ensure new user profiles explicitly set onboarding state so new users see onboarding.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, plan, weekly_digest_enabled, time_zone, onboarding_completed, onboarding_version)
  VALUES (
    NEW.id,
    'free',
    true,
    'America/Denver',
    false,
    'v2'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
