'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import AccountDropdown from './header/AccountDropdown';
import ThemeToggle from './ThemeToggle';
import CommandPalette from './command-palette/CommandPalette';
import { useKeyboardShortcut } from '@/app/hooks/useKeyboardShortcut';

// Determine app environment at build time
const APP_ENV =
  process.env.NEXT_PUBLIC_APP_ENV ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  'development';

const SHOW_DEV_BADGE = APP_ENV !== 'production';

export default function Nav() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Check auth state
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

  // Keyboard shortcut handler (CommandPalette also handles this, but we need it here for the button)
  useKeyboardShortcut({
    key: 'k',
    metaKey: true,
    onPress: () => setShowCommandPalette(true),
  });

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { href: '/projects', label: 'Projects' },
    { href: '/unassigned', label: 'Unassigned' },
    { href: '/ask', label: 'Ask' },
    { href: '/import', label: 'Import' },
  ];

  // Show nothing while loading
  if (loading) {
    return null;
  }

  // Signed-out state: Only INDEX logo and Sign in button
  if (!user) {
    return (
      <nav 
        className="sticky top-0 z-50 border-b border-[rgb(var(--ring)/0.08)] bg-[rgb(var(--surface)/0.85)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="font-serif text-xl font-semibold text-[rgb(var(--text))] hover:opacity-70 transition-opacity"
              >
                INDEX
              </Link>
              {SHOW_DEV_BADGE && (
                <span className="inline-flex items-center rounded-full border border-[rgb(var(--ring)/0.25)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Dev
                </span>
              )}
            </div>
            <Link
              href="/auth/signin"
              className="text-sm text-[rgb(var(--text))] hover:opacity-70 transition-opacity font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Signed-in state: Full navigation
  return (
    <>
      <nav 
        className="sticky top-0 z-50 border-b border-[rgb(var(--ring)/0.08)] bg-[rgb(var(--surface)/0.85)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link
                href="/home"
                className="font-serif text-xl font-semibold text-[rgb(var(--text))] hover:opacity-70 transition-opacity"
              >
                INDEX
              </Link>
              {/* Desktop navigation */}
              <div className="hidden md:flex items-center space-x-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {SHOW_DEV_BADGE && (
                <span className="hidden sm:inline-flex items-center rounded-full border border-[rgb(var(--ring)/0.25)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Dev
                </span>
              )}
              <button
                onClick={() => setShowCommandPalette(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[rgb(var(--muted))] border border-[rgb(var(--ring)/0.12)] rounded-md hover:bg-[rgb(var(--surface2))] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                aria-label="Open command palette"
              >
                <kbd className="font-mono text-[10px]">⌘</kbd>
                <kbd className="font-mono text-[10px]">K</kbd>
              </button>
              <ThemeToggle />
              <AccountDropdown />
              {/* Mobile hamburger button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-9 h-9 rounded-lg ring-1 ring-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface2))] flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-[rgb(var(--text))]"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-[rgb(var(--text))]"
                  >
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div
            ref={mobileMenuRef}
            className="fixed top-16 left-0 right-0 bottom-0 bg-[rgb(var(--surface))] border-b border-[rgb(var(--ring)/0.08)] overflow-y-auto"
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-[rgb(var(--ring)/0.08)]">
                <button
                  onClick={() => {
                    setShowCommandPalette(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-base text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                >
                  Command Palette (⌘K)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />
      )}
    </>
  );
}
