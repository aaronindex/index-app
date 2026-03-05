'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { shouldShowExtensionNudges } from '@/lib/extension-nudge/state';

export default function ExtensionNudgePill() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const update = () => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setVisible(!!user && shouldShowExtensionNudges());
      });
    };
    update();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => update());
    const onDismissed = () => setVisible(false);
    window.addEventListener('index_extension_nudges_dismissed', onDismissed);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('index_extension_nudges_dismissed', onDismissed);
    };
  }, []);

  if (!visible) return null;

  return (
    <Link
      href="/extension"
      className="fixed bottom-6 left-6 z-40 px-3 py-2 text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.12)] rounded-full shadow-sm hover:ring-[rgb(var(--ring)/0.2)] transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
      aria-label="Install extension"
    >
      Install extension
    </Link>
  );
}
