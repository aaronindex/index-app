// app/projects/[id]/components/ReadTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ReadTabProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  snapshotText: string | null;
  snapshotGeneratedAt: string | null;
  activeArcs: Array<{ id: string; title: string | null; status: string | null }>;
}

interface StillUnfoldingItem {
  type: 'decision' | 'task';
  id: string;
  title: string;
  isBlocker: boolean;
  isOpenLoop: boolean;
  conversationId: string | null;
  conversationTitle: string | null;
}

interface RecentDecision {
  id: string;
  title: string;
  created_at: string;
}

interface NextTask {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export default function ReadTab({
  projectId,
  projectName,
  projectDescription,
  snapshotText,
  snapshotGeneratedAt,
  activeArcs,
}: ReadTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stillUnfolding, setStillUnfolding] = useState<StillUnfoldingItem[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([]);
  const [nextTasks, setNextTasks] = useState<NextTask[]>([]);
  const [hasConversations, setHasConversations] = useState<boolean | null>(null);

  // Check if project has conversations
  useEffect(() => {
    async function checkConversations() {
      try {
        const response = await fetch(`/api/projects/${projectId}/has-conversations`);
        if (response.ok) {
          const data = await response.json();
          setHasConversations(data.hasConversations);
        } else {
          setHasConversations(true);
        }
      } catch (error) {
        console.error('Error checking conversations:', error);
        setHasConversations(true);
      }
    }
    checkConversations();
  }, [projectId]);

  // Fetch all Read data
  useEffect(() => {
    async function fetchReadData() {
      try {
        // Fetch still unfolding (active tensions)
        const stillOpenResponse = await fetch(`/api/projects/${projectId}/still-open`);
        if (stillOpenResponse.ok) {
          const stillOpenData = await stillOpenResponse.json();
          setStillUnfolding(stillOpenData.items || []);
        }

        // Fetch recent decisions (limit 5)
        const decisionsResponse = await fetch(`/api/projects/${projectId}/read-data?type=decisions&limit=5`);
        if (decisionsResponse.ok) {
          const decisionsData = await decisionsResponse.json();
          setRecentDecisions(decisionsData.items || []);
        }

        // Fetch next tasks (limit 5)
        const tasksResponse = await fetch(`/api/projects/${projectId}/read-data?type=tasks&limit=5`);
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setNextTasks(tasksData.items || []);
        }

      } catch (error) {
        console.error('Error fetching read data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchReadData();
  }, [projectId]);

  // Show empty state if no conversations
  if (!loading && hasConversations === false) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-12 text-center border border-[rgb(var(--ring)/0.08)] rounded-lg">
          <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
            Import your first chat to get started
          </h3>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Once you import a conversation, INDEX will extract insights, tasks, and decisions.
          </p>
          <button
            onClick={() => router.push(`/import?project=${projectId}`)}
            className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity"
          >
            Import chat
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const stillIds = new Set(
    stillUnfolding
      .filter((item) => item.type === 'task')
      .map((item) => item.id)
  );
  const filteredNextTasks = nextTasks.filter((task) => !stillIds.has(task.id));

  const openDecisions = stillUnfolding.filter((item) => item.type === 'decision');
  const openTasksFromStill = stillUnfolding.filter((item) => item.type === 'task');
  const totalOpenTasks = openTasksFromStill.length + filteredNextTasks.length;

  // Simple motion timeline based on decision/task timestamps (UI-only, no new logic)
  const timelineItems = [...recentDecisions.map((d) => ({ kind: 'decision' as const, occurred_at: d.created_at })), ...nextTasks.map((t) => ({ kind: 'task' as const, occurred_at: t.created_at }))].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );

  const formatSnapshotUpdated = (value: string | null): string | null => {
    if (!value) return null;
    const updatedAt = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - updatedAt.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    if (diffMinutes < 1) return 'Updated just now';
    if (diffMinutes < 60) return `Updated ${Math.round(diffMinutes)} min ago`;
    const diffHours = diffMinutes / 60;
    if (diffHours < 24) return `Updated ${Math.round(diffHours)} hr ago`;
    const diffDays = diffHours / 24;
    return `Updated ${Math.round(diffDays)} days ago`;
  };

  const snapshotUpdatedLabel = formatSnapshotUpdated(snapshotGeneratedAt);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Collapse block: visible transformation summary */}
      <div className="border border-[rgb(var(--ring)/0.08)] rounded-lg px-6 py-6 mt-2 mb-10">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="font-serif text-xl font-semibold text-[rgb(var(--text))]">
            Distilled
          </div>
          {/* Sources line omitted for now (source count not available in this view) */}
          <div className="text-sm text-[rgb(var(--text))]">
            <span className="font-medium">{openDecisions.length}</span> Decisions
            {' · '}
            <span className="font-medium">{totalOpenTasks}</span> Tasks
            {activeArcs.length > 0 && (
              <>
                {' · '}
                <span className="font-medium">{activeArcs.length}</span> Arc
                {activeArcs.length === 1 ? '' : 's'}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active Arcs */}
      {activeArcs.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
            Active Arcs
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-[rgb(var(--text))]">
            {activeArcs.map((arc) => (
              <li key={arc.id}>
                {arc.title || 'Untitled arc'}
                {arc.status && (
                  <span className="text-xs text-[rgb(var(--muted))]"> — {arc.status}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Snapshot */}
      {snapshotText && (
        <div className="border border-[rgb(var(--ring)/0.08)] rounded-lg p-4">
          {snapshotUpdatedLabel && (
            <p className="text-xs text-[rgb(var(--muted))] mb-2">{snapshotUpdatedLabel}</p>
          )}
          <div className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap">
            {snapshotText}
          </div>
        </div>
      )}

      {/* Open Decisions (from active tensions) */}
      {openDecisions.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
            Open Decisions
          </h2>
          <ul className="space-y-2">
            {openDecisions.map((item) => (
              <li key={`decision-${item.id}`}>
                <Link
                  href={`/projects/${projectId}/decisions?tab=decisions#${item.id}`}
                  className="block text-sm text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {item.isBlocker && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                        Blocker
                      </span>
                    )}
                    {item.isOpenLoop && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                        Open loop
                      </span>
                    )}
                    <span className="flex-1">{item.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Open Tasks (tasks that still carry weight) */}
      {totalOpenTasks > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
            Open Tasks
          </h2>
          <ul className="space-y-2">
            {openTasksFromStill.map((item) => (
              <li key={`still-task-${item.id}`}>
                <Link
                  href={`/projects/${projectId}/tasks?tab=tasks#${item.id}`}
                  className="block text-sm text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {item.isBlocker && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                        Blocker
                      </span>
                    )}
                    {item.isOpenLoop && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                        Open loop
                      </span>
                    )}
                    <span className="flex-1">{item.title}</span>
                  </span>
                </Link>
              </li>
            ))}
            {filteredNextTasks.map((task) => (
              <li key={`next-task-${task.id}`}>
                <Link
                  href={`/projects/${projectId}/tasks?tab=tasks#${task.id}`}
                  className="block text-sm text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] transition-colors"
                >
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Motion Timeline (minimal, spacing-driven) */}
      {timelineItems.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
            Motion Timeline
          </h2>
          <div className="border border-[rgb(var(--ring)/0.08)] rounded-lg p-4">
            <div className="flex flex-col">
              {timelineItems.map((event, index) => {
                const currentDate = new Date(event.occurred_at);
                const prevDate =
                  index > 0 ? new Date(timelineItems[index - 1].occurred_at) : null;
                let extraGapClass = '';
                if (prevDate) {
                  const diffDays =
                    (currentDate.getTime() - prevDate.getTime()) /
                    (1000 * 60 * 60 * 24);
                  if (diffDays > 21) {
                    extraGapClass = 'mt-6';
                  } else if (diffDays > 7) {
                    extraGapClass = 'mt-4';
                  } else if (diffDays > 2) {
                    extraGapClass = 'mt-2';
                  }
                }
                return (
                  <div key={`${event.kind}-${index}`} className={`flex items-center text-xs text-[rgb(var(--muted))] ${extraGapClass}`}>
                    <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[rgb(var(--text))]" />
                    <span>{currentDate.toLocaleDateString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state if no data */}
      {openDecisions.length === 0 && totalOpenTasks === 0 && hasConversations === true && (
        <div className="p-12 text-center border border-[rgb(var(--ring)/0.08)] rounded-lg">
          <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
            Nothing surfaced yet.
          </h3>
          <p className="text-sm text-[rgb(var(--muted))] mb-2">
            As you work, INDEX will surface the decisions and open loops that matter most.
          </p>
          <p className="text-xs text-[rgb(var(--muted))] italic mt-4">
            Start with a conversation or extract insights.
          </p>
        </div>
      )}
    </div>
  );
}
