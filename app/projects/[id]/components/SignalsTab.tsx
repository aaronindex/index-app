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

type ThemeItem = { theme_name: string; signal_ids: string[] };

export default function SignalsTab({
  decisions,
  tasks,
  highlights,
  projectId,
  projectName,
}: SignalsTabProps) {
  const [themes, setThemes] = useState<ThemeItem[]>([]);
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
        if (!cancelled && Array.isArray(data.themes)) setThemes(data.themes);
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

  const scrollToSignal = (signalId: string) => {
    const el = document.querySelector(`[data-signal-id="${signalId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const showEmergingThemes =
    signalsForApi.length >= 2 && (themes.length > 0 || themesLoading);

  return (
    <div className="space-y-12">
      {showEmergingThemes && (
        <section aria-labelledby="signals-emerging-themes-heading">
          <h2
            id="signals-emerging-themes-heading"
            className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3"
          >
            Emerging Themes
          </h2>
          {themesLoading ? (
            <p className="text-sm text-[rgb(var(--muted))]">Identifying themes…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themes.map((theme, idx) => {
                const ids = theme.signal_ids.filter((id) => signalTitleById.has(id));
                if (ids.length === 0) return null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToSignal(ids[0]!)}
                    className="text-left p-3 rounded-xl border border-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--ring)/0.04)] transition-colors"
                  >
                    <div className="font-medium text-sm text-[rgb(var(--text))] mb-1">
                      {theme.theme_name}
                    </div>
                    <div className="text-[11px] text-[rgb(var(--muted))] mb-2">
                      {ids.length} signal{ids.length !== 1 ? 's' : ''}
                    </div>
                    <ul className="space-y-0.5 text-xs text-[rgb(var(--muted))] list-disc list-inside">
                      {ids.slice(0, 5).map((id) => (
                        <li key={id}>{signalTitleById.get(id) || id}</li>
                      ))}
                      {ids.length > 5 && (
                        <li className="list-none text-[11px]">+{ids.length - 5} more</li>
                      )}
                    </ul>
                  </button>
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
