// app/components/header/AccountDropdown.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export default function AccountDropdown() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const userInitial = user.email?.[0]?.toUpperCase() || 'A';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-lg ring-1 ring-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface2))] flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        <div className="w-7 h-7 rounded-full bg-[rgb(var(--surface2))] flex items-center justify-center text-sm font-medium text-[rgb(var(--text))]">
          {userInitial}
        </div>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-56 bg-[rgb(var(--surface))] rounded-xl shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)] z-50 overflow-hidden"
        >
          <div className="p-3 border-b border-[rgb(var(--ring)/0.08)]">
            <p className="text-xs text-[rgb(var(--muted))] select-all">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] transition-colors focus:outline-none focus:bg-[rgb(var(--surface2))]"
            >
              Settings
            </Link>
            <Link
              href="/feedback"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] transition-colors focus:outline-none focus:bg-[rgb(var(--surface2))]"
            >
              Feedback
            </Link>
            <Link
              href="/settings?tab=data"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] transition-colors focus:outline-none focus:bg-[rgb(var(--surface2))]"
            >
              Data & Privacy
            </Link>
          </div>

          <div className="border-t border-[rgb(var(--ring)/0.08)] py-1">
            <button
              onClick={async () => {
                setIsOpen(false);
                const supabase = getSupabaseBrowserClient();
                await supabase.auth.signOut();
                router.push('/');
                router.refresh();
              }}
              className="w-full text-left px-4 py-2 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] transition-colors focus:outline-none focus:bg-[rgb(var(--surface2))]"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
