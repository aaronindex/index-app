// app/components/MagicHomeScreen.tsx
// Logged-in landing: Direction, Shifts, Timeline, Weekly Digest. Matches Project Read styling.

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import OnboardingFlow from './OnboardingFlow';
import PostImportModal from './PostImportModal';
import Card from './ui/Card';
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
  direction: { snapshotText: string | null; hasArcs: boolean };
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

function formatShiftDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
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
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="max-w-[260px] min-w-[180px] rounded-md border border-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] px-2 py-1 shadow-sm">
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
  const shifts = data?.shifts ?? [];
  const timelineEvents = data?.timelineEvents ?? [];
  const weeklyDigest = data?.weeklyDigest ?? null;
  const hasConversations = data?.hasConversations ?? false;

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
          {/* 1. Direction (global snapshot) — plain text block */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Direction
            </h2>
            <div className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap">
              {!hasArcs || !data ? (
                <p className="text-[rgb(var(--text))]">
                  Your INDEX will show the direction of your thinking as sources are distilled.
                </p>
              ) : directionText ? (
                directionText
              ) : (
                <p className="text-[rgb(var(--text))]">Exploration ongoing.</p>
              )}
            </div>
          </div>

          <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 2. Shifts — recent structural pulses */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Shifts
            </h2>
            {(!data || shifts.length === 0) ? (
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

          <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 3. Timeline (global) — pulse-based, result = larger dot */}
          <GlobalTimeline events={timelineEvents} />

          <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 4. Weekly Digest — card */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Weekly Digest
            </h2>
            <Card className="p-6 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
              {weeklyDigest?.body ? (
                <>
                  <div className="mb-4 pb-4 border-b border-[rgb(var(--ring)/0.08)]">
                    <Link
                      href={`/digests/${weeklyDigest.id}`}
                      className="block text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] text-xs mb-2"
                    >
                      {formatDigestDate(weeklyDigest.week_start)} – {formatDigestDate(weeklyDigest.week_end)} → View full
                    </Link>
                    <div className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap">
                      {weeklyDigest.body}
                    </div>
                  </div>
                  <GenerateDigestButton />
                </>
              ) : (
                <>
                  <p className="text-sm text-[rgb(var(--muted))] mb-4">
                    Weekly digest appears once structural change occurs.
                  </p>
                  <GenerateDigestButton />
                </>
              )}
            </Card>
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
