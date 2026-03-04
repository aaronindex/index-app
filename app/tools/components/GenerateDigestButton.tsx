// app/tools/components/GenerateDigestButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export default function GenerateDigestButton({ disabled = false, variant = 'primary' }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [currentEmailPreference, setCurrentEmailPreference] = useState<boolean | null>(null);

  // Fetch current email preference on mount
  useEffect(() => {
    const fetchPreference = async () => {
      try {
        const response = await fetch('/api/home/data');
        if (response.ok) {
          const data = await response.json();
          if (data.weekly_digest_enabled !== undefined) {
            setCurrentEmailPreference(data.weekly_digest_enabled);
            setEmailOptIn(data.weekly_digest_enabled);
          }
        }
      } catch (err) {
        console.error('Failed to fetch email preference:', err);
      }
    };
    fetchPreference();
  }, []);

  // Set default to last week
  const setDefaultDates = () => {
    const today = new Date();
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - today.getDay()); // Last Sunday
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Monday of last week

    setWeekEnd(lastWeekEnd.toISOString().split('T')[0]);
    setWeekStart(lastWeekStart.toISOString().split('T')[0]);
  };

  const handleOpen = () => {
    setDefaultDates();
    setIsOpen(true);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!weekStart || !weekEnd) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update email preference if changed
      if (currentEmailPreference !== null && emailOptIn !== currentEmailPreference) {
        const prefResponse = await fetch('/api/profile/update-digest-email', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekly_digest_enabled: emailOptIn }),
        });

        if (!prefResponse.ok) {
          console.error('Failed to update email preference');
        }
      }

      // Generate digest (returns digest or no-movement digest; never hangs)
      const response = await fetch('/api/digests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, weekEnd }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate digest');
      }

      const { digest } = await response.json();
      router.push(`/digests/${digest.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate digest');
    } finally {
      setLoading(false);
    }
  };

  const isSecondary = variant === 'secondary';
  const buttonClass = isSecondary
    ? 'px-3 py-1.5 text-sm font-medium rounded-lg border border-[rgb(var(--ring)/0.16)] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
    : 'px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed';

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={disabled ? undefined : handleOpen}
        disabled={disabled}
        className={buttonClass}
      >
        Generate Weekly Digest
      </button>
    );
  }

  return (
    <div className="border border-[rgb(var(--ring)/0.08)] rounded-lg p-4 bg-[rgb(var(--surface))]">
      <h3 className="font-serif text-base font-semibold text-[rgb(var(--text))] mb-3">Generate Weekly Digest</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1.5">Week Start</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[rgb(var(--ring)/0.16)] rounded-lg bg-[rgb(var(--bg))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[rgb(var(--text))] mb-1.5">Week End</label>
          <input
            type="date"
            value={weekEnd}
            onChange={(e) => setWeekEnd(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[rgb(var(--ring)/0.16)] rounded-lg bg-[rgb(var(--bg))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
          />
        </div>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="email-opt-in"
            checked={emailOptIn}
            onChange={(e) => setEmailOptIn(e.target.checked)}
            className="w-4 h-4 rounded border-[rgb(var(--ring)/0.2)] text-[rgb(var(--text))] focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
          />
          <label htmlFor="email-opt-in" className="text-sm text-[rgb(var(--muted))]">
            Email me weekly digests
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !weekStart || !weekEnd}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[rgb(var(--ring)/0.16)] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); setError(null); }}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[rgb(var(--ring)/0.16)] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface2))] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

