// app/components/CookieNotice.tsx
// Simple cookie notice banner

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'index_cookie_notice_dismissed';

export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if notice has been dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY) === '1';
    if (!dismissed) {
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-[rgb(var(--surface))] border-t border-[rgb(var(--ring)/0.12)] shadow-lg animate-[slideUp_0.3s_ease-out]"
      role="banner"
      aria-live="polite"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 text-sm text-[rgb(var(--text))]">
            <p>
              INDEX uses minimal cookies for login and anonymous usage analytics.{' '}
              <Link
                href="/privacy"
                className="underline hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] rounded"
              >
                Privacy
              </Link>
              {' · '}
              <Link
                href="/terms"
                className="underline hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] rounded"
              >
                Terms
              </Link>
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] disabled:opacity-50"
            aria-label="Dismiss cookie notice"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

