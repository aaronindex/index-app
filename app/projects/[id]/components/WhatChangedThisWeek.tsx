// app/projects/[id]/components/WhatChangedThisWeek.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import CreateTaskButton from './CreateTaskButton';

interface WhatChangedThisWeekProps {
  projectId: string;
}

interface WhatChangedData {
  weekStart: string;
  weekEnd: string;
  tasks: {
    completed: number;
    started: number;
    created: number;
    totalChanged: number;
    items: Array<{
      id: string;
      title: string;
      status: string;
      updated_at: string;
    }>;
  };
  decisions: {
    created: number;
    items: Array<{
      id: string;
      title: string;
      created_at: string;
    }>;
  };
  highlights: {
    created: number;
    items: Array<{
      id: string;
      content: string;
      label: string | null;
      created_at: string;
    }>;
  };
  conversations: {
    added: number;
    items: Array<{
      id: string;
      title: string | null;
      created_at: string;
    }>;
  };
}

export default function WhatChangedThisWeek({ projectId }: WhatChangedThisWeekProps) {
  const [data, setData] = useState<WhatChangedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/projects/${projectId}/what-changed`);
        if (!response.ok) {
          throw new Error('Failed to fetch changes');
        }
        const result = await response.json();
        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Failed to load changes');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId]);

  if (loading) {
    return (
      <div>
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-pulse">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const hasChanges =
    data.tasks.totalChanged > 0 ||
    data.decisions.created > 0;

  // Check if there are open/unresolved items (tasks with open/priority status, or any decisions)
  const hasOpenItems = 
    (data.tasks.items.some((t) => t.status === 'open' || t.status === 'priority' || t.status === 'in_progress')) ||
    data.decisions.items.length > 0;

  if (!hasChanges) {
    return (
      <div>
        <h3 className="font-medium text-foreground mb-2">Still Open</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No open items in the last 7 days.
        </p>
      </div>
    );
  }

  return (
      <div className="space-y-8">
      <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))]">Still Open</h3>
      <div className="space-y-6">
        {/* Decisions Cards - Primary (increased visual weight) */}
        {data.decisions.items.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-[rgb(var(--text))] mb-4">Decisions</h4>
            <div className="space-y-3">
              {data.decisions.items.map((decision) => (
                <Link
                  key={decision.id}
                  href={`/projects/${projectId}?tab=decisions`}
                  className="block p-5 rounded-xl bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))] shadow-md ring-2 ring-[rgb(var(--ring)/0.12)] hover:shadow-lg hover:ring-[rgb(var(--ring)/0.2)] transition-all"
                >
                  <p className="text-base font-semibold text-[rgb(var(--text))]">{decision.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Cards - Primary (separated by priority/relevance) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[rgb(var(--text))]">Tasks</h4>
            <CreateTaskButton projectId={projectId} />
          </div>
          {data.tasks.items.length > 0 && (
            <>
              {/* Primary/Most Relevant Tasks (priority, in_progress) */}
            {data.tasks.items.filter((t) => t.status === 'priority' || t.status === 'in_progress').length > 0 && (
              <div className="mb-4">
                <div className="space-y-3">
                  {data.tasks.items
                    .filter((t) => t.status === 'priority' || t.status === 'in_progress')
                    .map((task) => (
                      <Link
                        key={task.id}
                        href={`/projects/${projectId}?tab=tasks`}
                        className="block p-4 rounded-xl bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))] shadow-sm ring-1 ring-[rgb(var(--ring)/0.08)] hover:shadow-md hover:ring-[rgb(var(--ring)/0.12)] transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[rgb(var(--text))]">{task.title}</p>
                            <p className="text-xs text-[rgb(var(--muted))] mt-1">
                              Status: {task.status}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
            
            {/* Other Open Tasks */}
            {data.tasks.items.filter((t) => t.status === 'open').length > 0 && (
              <div className={data.tasks.items.filter((t) => t.status === 'priority' || t.status === 'in_progress').length > 0 ? 'pt-4 border-t border-[rgb(var(--ring)/0.08)]' : ''}>
                <div className="space-y-2">
                  {data.tasks.items
                    .filter((t) => t.status === 'open')
                    .map((task) => (
                      <Link
                        key={task.id}
                        href={`/projects/${projectId}?tab=tasks`}
                        className="block p-3 rounded-lg bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.05)] hover:ring-[rgb(var(--ring)/0.08)] transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[rgb(var(--text))]">{task.title}</p>
                            <p className="text-xs text-[rgb(var(--muted))] mt-1">
                              Status: {task.status}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

