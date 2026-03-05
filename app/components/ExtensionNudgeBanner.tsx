'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { shouldShowExtensionNudges, setExtensionNudgesDismissed } from '@/lib/extension-nudge/state';

export default function ExtensionNudgeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowExtensionNudges());
  }, []);

  const handleDismiss = () => {
    setExtensionNudgesDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="rounded-lg border border-[rgb(var(--ring)/0.08)] bg-[rgb(var(--surface))] px-4 py-3 flex flex-wrap items-center justify-between gap-3 mb-6"
      role="region"
      aria-label="Extension nudge"
    >
      <p className="text-sm text-[rgb(var(--text))]">
        Capture moments while you think. Install the extension.
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/extension"
          className="text-sm font-medium text-[rgb(var(--text))] hover:opacity-80 transition-opacity underline focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] rounded"
        >
          Install extension
        </Link>
        <span className="text-[rgb(var(--ring)/0.3)]">·</span>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] rounded"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
