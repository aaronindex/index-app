// app/projects/[id]/components/WhatChangedThisWeek.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';

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
    data.decisions.created > 0 ||
    data.highlights.created > 0 ||
    data.conversations.added > 0;

  if (!hasChanges) {
    return (
      <div>
        <h3 className="font-medium text-foreground mb-2">What Changed This Week</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No changes in the last 7 days.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-medium text-foreground mb-4">What Changed This Week</h3>
      <div className="space-y-3">
        {/* Tasks Cards */}
        {data.tasks.items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Tasks</h4>
            <div className="space-y-2">
              {data.tasks.items.map((task) => (
                <Link
                  key={task.id}
                  href={`/projects/${projectId}?tab=tasks`}
                  className="block p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                        Status: {task.status}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Decisions Cards */}
        {data.decisions.items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Decisions</h4>
            <div className="space-y-2">
              {data.decisions.items.map((decision) => (
                <Link
                  key={decision.id}
                  href={`/projects/${projectId}?tab=decisions`}
                  className="block p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{decision.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Highlights Cards */}
        {data.highlights.items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Highlights</h4>
            <div className="space-y-2">
              {data.highlights.items.map((highlight) => (
                <Link
                  key={highlight.id}
                  href={`/projects/${projectId}?tab=highlights`}
                  className="block p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground mb-1">
                    {highlight.label || 'Highlight'}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {highlight.content}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Conversations Cards */}
        {data.conversations.items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Conversations</h4>
            <div className="space-y-2">
              {data.conversations.items.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/conversations/${conversation.id}`}
                  className="block p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">
                    {conversation.title || 'Untitled Conversation'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

