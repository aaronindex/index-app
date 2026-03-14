// app/components/MagicHomeScreen.tsx
// Logged-in landing: Direction, Shifts, Timeline, Weekly Log. Matches Project Read styling.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ExtensionNudgeBanner from './ExtensionNudgeBanner';
import PostImportModal from './PostImportModal';
import { isOnboardingInProgress } from '@/lib/onboarding/state';
import { showError } from './ErrorNotification';
import GenerateDigestButton from '../tools/components/GenerateDigestButton';
import ReadStructure from './ReadStructure';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
// OnboardingController now mounted globally via GlobalOnboarding in root layout

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
    active_arc_count: number;
    project_count: number;
    lastChangeAt: string | null;
    signals?: Array<{ id: string; label: string }>;
    arc?: string | null;
    sourceCount?: number;
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

type MagicHomeScreenProps = {
  /** Server-rendered data; when set, no client fetch on mount (avoids flicker) */
  initialData?: LandingData | null;
  /** Server-computed: show focus modal (conversations exist, no digest yet, not dismissed). When set, modal does not depend on client fetch. */
  initialShowFocusModal?: boolean;
};

/** "Mar 3" for Shifts list line */
function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/** "Mar 3, 2026" for tooltips / full date */
function formatFullDate(iso: string): string {
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

/** "Last change: X ago" from most recent pulse */
function formatLastChangeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Last change: just now';
    if (diffMins < 60) return `Last change: ${diffMins} min ago`;
    if (diffHours < 24) return `Last change: ${diffHours} hr ago`;
    if (diffDays < 7) return `Last change: ${diffDays} days ago`;
    return `Last change: ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

const ASK_EXAMPLE_PROMPTS = [
  'What needs attention?',
  'Where is momentum building?',
  'What decisions remain unresolved?',
  'What changed recently?',
];

function HomeAskModule() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'global' | 'project'>('global');
  const [scopeProjectId, setScopeProjectId] = useState('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setProjects(data || []);
      } catch {
        // ignore
      }
    };
    loadProjects();
  }, []);

  const redirectToAsk = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const params = new URLSearchParams({ q: trimmed });
    if (scope === 'project' && scopeProjectId) params.set('project', scopeProjectId);
    window.location.href = `/ask?${params.toString()}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    redirectToAsk(query);
  };

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-8">
      <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
        Ask INDEX
      </h2>
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="flex gap-0 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden focus-within:ring-2 focus-within:ring-zinc-500 dark:focus-within:ring-zinc-400">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What's still unresolved?"
            className="flex-1 min-w-0 px-4 py-3 bg-transparent text-foreground focus:outline-none"
          />
          <div className="flex items-center border-l border-zinc-300 dark:border-zinc-700 pl-3 pr-3 py-1">
            <select
              value={scope === 'global' ? '' : scopeProjectId}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setScope('global');
                  setScopeProjectId('');
                } else {
                  setScope('project');
                  setScopeProjectId(val);
                }
              }}
              className="bg-transparent text-sm text-[rgb(var(--muted))] focus:outline-none cursor-pointer"
            >
              <option value="">Across Your INDEX</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-6 py-3 bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Search
          </button>
        </div>
      </form>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgb(var(--muted))]">
        {ASK_EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setQuery(prompt);
              inputRef.current?.focus();
            }}
            className="hover:text-[rgb(var(--text))] transition-colors underline underline-offset-2"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function GlobalTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div>
        <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
          Timeline
        </h2>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Dots mark structural shifts. Spacing reflects time between them.
        </p>
        <div className="relative h-12 mt-2">
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
      <p className="mt-1 text-sm text-[rgb(var(--muted))]">
        Dots mark structural shifts. Spacing reflects time between them.
      </p>
      <div className="relative h-12 mt-2">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-[rgb(var(--ring)/0.12)]" />
        {withTime.map((item) => {
          const pos = span === 0 ? 0.5 : (item.ts - t0) / span;
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
                  <div className="max-w-[260px] min-w-[220px] rounded-md border border-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] px-2 py-1 shadow-sm font-sans">
                    <div className="text-[10px] text-[rgb(var(--muted))]">
                      {item.isResult ? 'Result recorded' : 'Structural shift'}
                    </div>
                    <div className="text-[10px] font-medium text-[rgb(var(--text))] mt-0.5">
                      {formatFullDate(item.occurred_at)}
                    </div>
                    <div className="mt-1 text-[10px] text-[rgb(var(--muted))] whitespace-normal break-words">
                      {item.isResult ? `Result: ${item.summary}` : item.summary}
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

export default function MagicHomeScreen({ initialData = null, initialShowFocusModal }: MagicHomeScreenProps = {}) {
  const [data, setData] = useState<LandingData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [postImportModalDismissed, setPostImportModalDismissed] = useState(false);
  const [onboardingInProgress, setOnboardingInProgress] = useState(false);

  useEffect(() => {
    const update = () => setOnboardingInProgress(isOnboardingInProgress());
    update();
    window.addEventListener('index_onboarding_completed', update);
    return () => window.removeEventListener('index_onboarding_completed', update);
  }, []);

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

  // Only fetch on mount when server did not provide initial data (avoids flicker)
  useEffect(() => {
    if (initialData == null) {
      fetchHomeData();
    }
  }, [initialData, fetchHomeData]);

  const hasArcs = data?.direction?.hasArcs ?? false;
  const directionText = data?.direction?.snapshotText ?? null;
  const directionGeneratedAt = data?.direction?.generatedAt ?? null;
  const activeArcCount = data?.direction?.active_arc_count ?? 0;
  const projectCount = data?.direction?.project_count ?? 0;
  const lastChangeAt = data?.direction?.lastChangeAt ?? null;
  const shifts = data?.shifts ?? [];
  const timelineEvents = data?.timelineEvents ?? [];
  const weeklyDigest = data?.weeklyDigest ?? null;
  const hasConversations = data?.hasConversations ?? false;
  const hasSnapshot = !!directionGeneratedAt;
  const hasStructuralChange = shifts.length > 0;
  const showDirectionStatusLine = activeArcCount > 0;
  const directionSignals = data?.direction?.signals ?? [];
  const directionArc = data?.direction?.arc ?? '';

  return (
    <div className="space-y-8">
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

      {!onboardingInProgress && <ExtensionNudgeBanner />}

      {/* Ask INDEX first — primary entry point; redirects to /ask?q= for full experience */}
      <HomeAskModule />

      {/* Section: Across your INDEX */}
      <h1 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-2">
        Across your INDEX
      </h1>

      <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 1. Direction (global snapshot) — Updated, status line, optional last change, body */}
          <div data-onboarding="direction-panel">
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Direction
            </h2>
            <div className="text-left">
              {hasSnapshot && formatUpdatedAgo(directionGeneratedAt) && (
                <p className="text-xs text-[rgb(var(--muted))] mb-1 font-sans">
                  {formatUpdatedAgo(directionGeneratedAt)}
                </p>
              )}
              {showDirectionStatusLine && (
                <p className="text-xs text-[rgb(var(--muted))] mb-1 font-sans">
                  {activeArcCount} arc(s) active across {projectCount} project(s)
                </p>
              )}
              {lastChangeAt && formatLastChangeAgo(lastChangeAt) && (
                <p className="text-xs text-[rgb(var(--muted))] mb-2 font-sans">
                  {formatLastChangeAgo(lastChangeAt)}
                </p>
              )}
              {!directionText?.trim() ? (
                <div className="text-sm font-sans space-y-3">
                  <div className="text-[rgb(var(--muted))]">
                    <p>No direction yet.</p>
                    <p className="mt-1 text-xs">
                      Direction appears as decisions accumulate.
                    </p>
                  </div>
                  <ReadStructure
                    arc={directionArc || (activeArcCount > 0 ? 'Current focus' : '')}
                    signals={(directionSignals ?? []).map((s) => ({ title: s.label }))}
                    sourceCount={data?.direction?.sourceCount}
                  />
                </div>
              ) : (
                <div className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap font-sans space-y-3">
                  <div>{directionText}</div>
                  <ReadStructure
                    arc={directionArc || (activeArcCount > 0 ? 'Current focus' : '')}
                    signals={(directionSignals ?? []).map((s) => ({ title: s.label }))}
                    sourceCount={data?.direction?.sourceCount}
                  />
                </div>
              )}
            </div>
          </div>

          <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 2. Shifts — MMM D — typedHeadline */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Shifts
            </h2>
            {!data || shifts.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted))] font-sans">No shifts yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm text-[rgb(var(--text))] font-sans">
                {shifts.map((s) => (
                  <li key={s.id}>
                    <span className="text-[rgb(var(--muted))]">{formatShortDate(s.occurred_at)}</span>
                    {' — '}
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 3. Timeline — tooltip: full date + same typedHeadline as Shifts */}
          <GlobalTimeline events={timelineEvents} />

          <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

          {/* 4. Weekly Log — single container; button disabled until there is something to log */}
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
              Weekly Log
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
                <GenerateDigestButton disabled={false} variant="secondary" />
              </div>
            ) : (
              <div>
                {!hasStructuralChange ? (
                  <p className="text-sm text-[rgb(var(--muted))] mb-3">
                    No structural changes to digest yet.
                  </p>
                ) : (
                  <p className="text-sm text-[rgb(var(--muted))] mb-3">
                    Choose a week to generate a digest.
                  </p>
                )}
                <GenerateDigestButton disabled={!hasStructuralChange} variant="secondary" />
              </div>
            )}
          </div>

          <PostImportModal
            isOpen={
              !onboardingInProgress &&
              (initialShowFocusModal !== undefined
                ? initialShowFocusModal
                : Boolean(hasConversations && !weeklyDigest?.body)) &&
              !postImportModalDismissed
            }
            onClose={async () => {
              setPostImportModalDismissed(true);
              try {
                await fetch('/api/ui/dismiss-focus-modal', { method: 'POST', credentials: 'same-origin' });
              } catch {
                // Cookie set on next full load; modal already hidden
              }
            }}
          />
    </div>
  );
}
