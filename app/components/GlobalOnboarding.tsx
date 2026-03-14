'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import OnboardingController from './onboarding/OnboardingController';

/**
 * Mounts OnboardingController when the user is authenticated so Step 1 appears
 * on any route (home, projects, ask, import) when onboarding is not completed.
 * Does not render on the logged-out landing page.
 */
export default function GlobalOnboarding() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setAuthenticated(!!user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setAuthenticated(!!session?.user);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (authenticated !== true) return null;
  return <OnboardingController />;
}
