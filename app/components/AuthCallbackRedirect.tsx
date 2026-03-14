'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

/**
 * When we're on the root path ("/"):
 * 1. If URL has ?code= (Supabase magic link / PKCE), redirect to /auth/callback so the server can exchange the code and set cookies, then redirect to /home.
 * 2. If we already have a session (e.g. user landed on / but is logged in), redirect to /home so they see the logged-in experience (and onboarding if needed).
 * This fixes: magic link landing on logged-out LP with session only in hash/query, and ensures post-auth we show /home.
 */
export default function AuthCallbackRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== '/') return;

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const code = params?.get('code');

    // Supabase sent user here with ?code=... (e.g. redirect URL was set to / instead of /auth/callback). Send to callback to exchange and redirect to /home.
    if (code) {
      const callbackUrl = `/auth/callback?${window.location.search}`;
      window.location.replace(callbackUrl);
      return;
    }

    // No code; check if we have a session (e.g. recovered from hash or already in cookies). If so, show /home.
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/home');
      }
    });
  }, [pathname, router]);

  return null;
}
