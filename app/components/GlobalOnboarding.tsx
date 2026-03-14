'use client';

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import TunnelOnboarding from './onboarding/TunnelOnboarding';

/**
 * Mounts tunnel onboarding when the user is authenticated so Step 1 appears
 * when onboarding is not completed. Step 2/3 modals are on import and project pages.
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
  return <TunnelOnboarding />;
}
