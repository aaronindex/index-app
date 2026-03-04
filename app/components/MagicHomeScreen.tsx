// app/components/MagicHomeScreen.tsx
// Logged-in landing: Direction, Shifts, Timeline, Weekly Digest. Matches Project Read styling.

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import OnboardingFlow from './OnboardingFlow';
import PostImportModal from './PostImportModal';
import { showError } from './ErrorNotification';
import GenerateDigestButton from '../tools/components/GenerateDigestButton';

type TimelineEvent = {
  id: string;
  occurred_at: string;
  summary: string;
  isResult?: boolean;
};

type ShiftItem = {
  id: string;
  occurred_at: string;
  label: string;
  pulse_type: string;
};

type LandingData = {
  hasConversations: boolean;
  hasProjects: boolean;
  direction: {
    snapshotText: string | null;
    hasArcs: boolean;
    generatedAt: string | null;
  };
  shifts: ShiftItem[];
  timelineEvents: TimelineEvent[];
  weeklyDigest: {
    id: string;
    week_start: string;
    week_end: string;
    body: string | null;
    summary: string | null;
  } | null;
};

/** "Mar 3, 2026" for Shifts list */
function formatShiftDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/** "Updated X ago" from snapshot_state.generated_at */
function formatUpdatedAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Updated just now';
    if (diffMins < 60) return `Updated ${diffMins} min ago`;
    if (diffHours < 24) return `Updated ${diffHours} hr ago`;
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } catch {
    return null;
  }
}

function formatDigestDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function GlobalTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div>
        <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
          Timeline
        </h2>
        <div className="relative h-12">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[rgb(var(--ring)/0.12)]" />
        </div>
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">
          Structural events will appear here as your thinking evolves.
        </p>
      </div>
    );
  }

  const withTime = events
    .map((e) => {
      const ts = new Date(e.occurred_at).getTime();
      if (Number.isNaN(ts)) return null;
      return { ...e, ts };
    })
    .filter((e): e is TimelineEvent & { ts: number } => e !== null)
    .sort((a, b) => a.ts - b.ts);

  if (withTime.length === 0) return null;

  const first = withTime[0]!;
  const last = withTime[withTime.length - 1]!;
  const t0 = first.ts;
  const tN = last.ts;
  const span = tN - t0 || 1;

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
        Timeline
      </h2>
      <div className="relative h-12">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-[rgb(var(--ring)/0.12)]" />
        {withTime.map((item) => {
          const pos = span === 0 ? 0.5 : (item.ts - t0) / span;
          const dateLabel = new Date(item.occurred_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          return (
            <div
              key={item.id}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${pos * 100}%` }}
            >
              <div className="group relative">
                <div
                  className={`rounded-full bg-[rgb(var(--text))] ${
                    item.isResult ? 'h-3 w-3' : 'h-2 w-2'
                  }`}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="max-w-[260px] min-w-[220px] rounded-md border border-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] px-2 py-1 shadow-sm">
                    <div className="text-[10px] font-medium text-[rgb(var(--text))]">
                      {dateLabel}
                    </div>
                    <div className="mt-1 text-[10px] text-[rgb(var(--muted))] whitespace-normal break-words">
                      {item.summary}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MagicHomeScreen() {
  const [data, setData] = useState<LandingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [postImportModalDismissed, setPostImportModalDismissed] = useState(false);

  const fetchHomeData = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/home/data', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to fetch home data (${response.status})`;
        throw new Error(errorMessage);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && (err.message === 'Failed to fetch' || err.message.includes('network')));
      const errorMessage = isNetworkError
        ? 'Connection problem. Check your network and try again.'
        : err instanceof Error
          ? err.message
          : 'Failed to load home data';
      setError(errorMessage);
      showError(errorMessage);
    }
  }, []);

  useEffect(() => {
    fetch('/api/lifecycle/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  useEffect(() => {
    try {
      const completed = localStorage.getItem('index_onboarding_completed');
      setOnboardingCompleted(completed === 'true');
    } catch {
      setOnboardingCompleted(false);
    }
  }, []);

  const showOnboarding = onboardingCompleted === false;
  const hasArcs = data?.direction?.hasArcs ?? false;
  const directionText = data?.direction?.snapshotText ?? null;
  const directionGeneratedAt = data?.direction?.generatedAt ?? null;
  const shifts = data?.shifts ?? [];
  const timelineEvents = data?.timelineEvents ?? [];
  const weeklyDigest = data?.weeklyDigest ?? null;
  const hasConversations = data?.hasConversations ?? false;
  const hasSnapshot = !!directionGeneratedAt;

  return (
    <div className="space-y-8 max-w-3xl">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800 flex items-center justify-between gap-4">
          <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          <button
            onClick={() => fetchHomeData()}
            className="shrink-0 px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => setOnboardingCompleted(true)}
        />
      )}

      {!showOnboarding && (
        <>
          {/* Page title — same hierarchy as other page titles */}
          <h1 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-2">
            Across your INDEX
          </h1>

          <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 1. Direction (global snapshot) — plain text block, no card */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Direction
            </h2>
            {!data || !hasSnapshot ? (
              <p className="text-sm text-[rgb(var(--text))]">
                Your INDEX will show the direction of your thinking as sources are distilled.
              </p>
            ) : (
              <div className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap">
                {formatUpdatedAgo(directionGeneratedAt) && (
                  <p className="text-xs text-[rgb(var(--muted))] mb-2">
                    {formatUpdatedAgo(directionGeneratedAt)}
                  </p>
                )}
                {directionText || 'Exploration ongoing.'}
              </div>
            )}
          </div>

          <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 2. Shifts — global pulses list (no "recent" in title) */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Shifts
            </h2>
            {!data || shifts.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted))]">No structural shifts yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm text-[rgb(var(--text))]">
                {shifts.map((s) => (
                  <li key={s.id}>
                    <span className="text-[rgb(var(--muted))]">
                      {formatShiftDate(s.occurred_at)} —
                    </span>{' '}
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 3. Timeline — always rendered; no HRs under Timeline (per spec) */}
          <GlobalTimeline events={timelineEvents} />

          {/* 4. Weekly Digest — single container (no nested card) */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Weekly Digest
            </h2>
            {weeklyDigest?.body ? (
              <div>
                <Link
                  href={`/digests/${weeklyDigest.id}`}
                  className="block text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] mb-2"
                >
                  {formatDigestDate(weeklyDigest.week_start)} – {formatDigestDate(weeklyDigest.week_end)} → View full
                </Link>
                <div className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap mb-4">
                  {weeklyDigest.body}
                </div>
                <GenerateDigestButton />
              </div>
            ) : (
              <div>
                <p className="text-sm text-[rgb(var(--muted))] mb-4">
                  Weekly digest appears once structural change occurs.
                </p>
                <GenerateDigestButton />
              </div>
            )}
          </div>

          <PostImportModal
            isOpen={
              hasConversations &&
              !weeklyDigest?.body &&
              !postImportModalDismissed
            }
            onClose={() => setPostImportModalDismissed(true)}
          />
        </>
      )}
    </div>
  );
}
