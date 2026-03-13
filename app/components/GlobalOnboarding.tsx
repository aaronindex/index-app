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
    let cancelled = false;
    getSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!cancelled) setAuthenticated(!!user);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authenticated !== true) return null;
  return <OnboardingController />;
}
