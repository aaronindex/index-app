// app/projects/[id]/components/SignalsTab.tsx
// Single Signals surface: Decisions, Tasks, Highlights in one place (Read / Signals / Sources nav).

'use client';

import { useState, useEffect, useMemo } from 'react';
import DecisionsTab from './DecisionsTab';
import TasksTab from './TasksTab';
import HighlightsTab from './HighlightsTab';

const EMERGING_THEMES_LIMIT = 20;

interface SignalsTabProps {
  decisions: Array<{
    id: string;
    title: string;
    content: string | null;
    conversation_title: string | null;
    conversation_id: string | null;
    created_at: string;
    is_inactive?: boolean;
    is_pinned?: boolean;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'complete' | 'cancelled' | 'dormant' | 'priority';
    horizon: 'this_week' | 'this_month' | 'later' | null;
    is_pinned?: boolean;
    sort_order: number | null;
    conversation_title: string | null;
    conversation_id: string | null;
    created_at: string;
    is_inactive?: boolean;
    source_query?: string | null;
  }>;
  highlights: Array<{
    id: string;
    content: string;
    label: string | null;
    status: string | null;
    conversation_title: string | null;
    conversation_id: string;
    created_at: string;
  }>;
  projectId: string;
  projectName: string;
}

type ThemeItem = {
  theme_name: string;
  signal_ids: string[];
  interpretation?: string;
};

export default function SignalsTab({
  decisions,
  tasks,
  highlights,
  projectId,
  projectName,
}: SignalsTabProps) {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [previousThemes, setPreviousThemes] = useState<ThemeItem[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);

  const signalsForApi = useMemo(() => {
    const withCreated = [
      ...decisions.map((d) => ({ id: d.id, title: d.title, created_at: d.created_at, type: 'decision' as const })),
      ...tasks.map((t) => ({ id: t.id, title: t.title, created_at: t.created_at, type: 'task' as const })),
      ...highlights.map((h) => ({
        id: h.id,
        title: (h.label || h.content.slice(0, 80)).trim() || 'Insight',
        created_at: h.created_at,
        type: 'insight' as const,
      })),
    ];
    return withCreated
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, EMERGING_THEMES_LIMIT)
      .map(({ id, title, type }) => ({ id, title, type }));
  }, [decisions, tasks, highlights]);

  const signalTitleById = useMemo(() => {
    const map = new Map<string, string>();
    decisions.forEach((d) => map.set(d.id, d.title));
    tasks.forEach((t) => map.set(t.id, t.title));
    highlights.forEach((h) => map.set(h.id, (h.label || h.content.slice(0, 80)).trim() || 'Insight'));
    return map;
  }, [decisions, tasks, highlights]);

  useEffect(() => {
    if (signalsForApi.length < 2) {
      setThemes([]);
      return;
    }
    let cancelled = false;
    setThemesLoading(true);
    fetch('/api/signals/emerging-themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: signalsForApi }),
    })
      .then((res) => (res.ok ? res.json() : { themes: [] }))
      .then((data) => {
        if (cancelled || !Array.isArray(data.themes)) return;

        const nextThemes: ThemeItem[] = data.themes;

        // Soft title stabilization: if a new cluster overlaps >=60% of its ids
        // with a previous cluster, keep the previous cluster's title.
        const stabilized: ThemeItem[] = nextThemes.map((theme: ThemeItem): ThemeItem => {
          const currentIds = new Set(theme.signal_ids);
          if (currentIds.size === 0 || previousThemes.length === 0) {
            return theme;
          }

          let bestOverlapRatio = 0;
          let stableName = theme.theme_name;

          previousThemes.forEach((prev) => {
            const prevIds = new Set(prev.signal_ids);
            if (prevIds.size === 0) return;

            let overlapCount = 0;
            currentIds.forEach((id) => {
              if (prevIds.has(id)) overlapCount += 1;
            });

            const ratio = overlapCount / currentIds.size;
            if (ratio > bestOverlapRatio) {
              bestOverlapRatio = ratio;
              stableName = prev.theme_name;
            }
          });

          if (bestOverlapRatio >= 0.6) {
            return {
              ...theme,
              theme_name: stableName,
            };
          }

          return theme;
        });

        // Sort by descending signal count for visual stability
        const sorted = [...stabilized].sort(
          (a, b) => b.signal_ids.length - a.signal_ids.length,
        );

        setThemes(sorted);
        setPreviousThemes(sorted);
      })
      .catch(() => {
        if (!cancelled) setThemes([]);
      })
      .finally(() => {
        if (!cancelled) setThemesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signalsForApi]);

  const [expandedThemeIndex, setExpandedThemeIndex] = useState<number | null>(null);

  const showEmergingThemes =
    signalsForApi.length >= 2 && (themes.length > 0 || themesLoading);

  return (
    <div className="space-y-12">
      {showEmergingThemes && (
        <section aria-labelledby="signals-emerging-themes-heading">
          <h2
            id="signals-emerging-themes-heading"
            className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-1"
          >
            Patterns emerging
          </h2>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Structural themes emerging from signals.
          </p>
          {themesLoading ? (
            <p className="text-sm text-[rgb(var(--muted))]">Identifying themes…</p>
          ) : (
            <div className="space-y-4">
              {themes.map((theme, idx) => {
                const ids = theme.signal_ids.filter((id) => signalTitleById.has(id));
                if (ids.length === 0) return null;
                const isExpanded = expandedThemeIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="font-semibold text-base text-[rgb(var(--text))] mb-1">
                        {theme.theme_name}
                      </div>
                      {theme.interpretation && (
                        <p className="text-sm text-[rgb(var(--muted))] mb-2">
                          {theme.interpretation}
                        </p>
                      )}
                      <p className="text-xs font-medium text-[rgb(var(--muted))] mb-3">
                        Derived from {ids.length} signals
                      </p>
                      {!isExpanded ? (
                        <button
                          type="button"
                          onClick={() => setExpandedThemeIndex(idx)}
                          className="text-sm font-medium text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] underline underline-offset-2 transition-colors"
                        >
                          View signals
                        </button>
                      ) : (
                        <>
                          <ul className="space-y-1.5 text-sm text-[rgb(var(--muted))] list-disc list-inside mb-3">
                            {ids.map((id) => (
                              <li key={id}>{signalTitleById.get(id) || id}</li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            onClick={() => setExpandedThemeIndex(null)}
                            className="text-sm font-medium text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] underline underline-offset-2 transition-colors"
                          >
                            Close
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="signals-decisions-heading">
        <DecisionsTab decisions={decisions} projectId={projectId} />
      </section>
      <section aria-labelledby="signals-tasks-heading">
        <TasksTab tasks={tasks} projectId={projectId} />
      </section>
      <section aria-labelledby="signals-highlights-heading">
        <HighlightsTab highlights={highlights} projectName={projectName} />
      </section>
    </div>
  );
}
