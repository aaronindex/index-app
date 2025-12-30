// app/components/header/SignOutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-9 h-9 rounded-lg ring-1 ring-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface2))] flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
      aria-label="Sign out"
      title="Sign out"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 text-[rgb(var(--text))]"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}

