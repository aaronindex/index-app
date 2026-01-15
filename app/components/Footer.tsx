// app/components/Footer.tsx
// Minimal footer with legal links

'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[rgb(var(--ring)/0.08)] bg-[rgb(var(--surface))]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[rgb(var(--muted))]">
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="hover:text-[rgb(var(--text))] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] rounded"
            >
              Pricing
            </Link>
            <span className="text-[rgb(var(--ring)/0.3)]">·</span>
            <Link
              href="/privacy"
              className="hover:text-[rgb(var(--text))] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] rounded"
            >
              Privacy
            </Link>
            <span className="text-[rgb(var(--ring)/0.3)]">·</span>
            <Link
              href="/terms"
              className="hover:text-[rgb(var(--text))] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] rounded"
            >
              Terms
            </Link>
          </div>
          <div className="text-[rgb(var(--muted))]">
            © {currentYear} INDEX
          </div>
        </div>
      </div>
    </footer>
  );
}

