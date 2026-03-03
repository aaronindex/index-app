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
  projectSnapshots: Array<{
    id: string;
    generated_at: string | null;
    snapshot_text: string | null;
    state_payload: any | null;
    hasOutcome: boolean;
    latestOutcomeText: string | null;
  }>;
  latestSnapshotOutcomeText?: string | null;
  sourceCount?: number | null;
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
  projectSnapshots,
  latestSnapshotOutcomeText,
  sourceCount,
}: ReadTabProps) {
  const router = useRouter();
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
      }
    }
    fetchReadData();
  }, [projectId]);

  // Show empty state if no conversations
  if (hasConversations === false) {
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

  const stillIds = new Set(
    stillUnfolding
      .filter((item) => item.type === 'task')
      .map((item) => item.id)
  );
  const filteredNextTasks = nextTasks.filter((task) => !stillIds.has(task.id));

  const openDecisions = stillUnfolding.filter((item) => item.type === 'decision');
  const openTasksFromStill = stillUnfolding.filter((item) => item.type === 'task');
  const totalOpenTasks = openTasksFromStill.length + filteredNextTasks.length;

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
  const decisionsCount = openDecisions.length;
  const tasksCount = totalOpenTasks;
  const arcsCount = activeArcs.length;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Collapse block: visible transformation summary */}
      <div className="border border-[rgb(var(--ring)/0.08)] rounded-lg px-5 py-4 mt-1 mb-8">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="font-serif text-xl font-semibold text-[rgb(var(--text))]">
            {typeof sourceCount === 'number' && sourceCount > 0
              ? `Distilled ${sourceCount} ${sourceCount === 1 ? 'Source' : 'Sources'}`
              : 'Distilled'}
          </div>
          {typeof sourceCount === 'number' && sourceCount > 0 && (
            <div className="text-lg leading-none">↓</div>
          )}
          <div className="text-sm text-[rgb(var(--text))] font-medium">
            <span className="font-semibold">{decisionsCount}</span>{' '}
            {decisionsCount === 1 ? 'Decision' : 'Decisions'}
            {' · '}
            <span className="font-semibold">{tasksCount}</span>{' '}
            {tasksCount === 1 ? 'Task' : 'Tasks'}
            {arcsCount > 0 && (
              <>
                {' · '}
                <span className="font-semibold">{arcsCount}</span>{' '}
                {arcsCount === 1 ? 'Arc' : 'Arcs'}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active Arcs */}
      <div>
        <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
          Active Arcs
        </h2>
        {activeArcs.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 text-sm text-[rgb(var(--text))]">
            {activeArcs.map((arc) => {
              const label = arc.title || 'Untitled arc';
              return (
                <li key={arc.id}>
                  {label}
                  {arc.status && (
                    <span className="text-xs text-[rgb(var(--muted))]"> — {arc.status}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[rgb(var(--muted))]">No active arcs.</p>
        )}
      </div>

      {/* Snapshot */}
      <div className="border border-[rgb(var(--ring)/0.08)] rounded-lg p-4">
        {snapshotUpdatedLabel && (
          <p className="text-xs text-[rgb(var(--muted))] mb-2">{snapshotUpdatedLabel}</p>
        )}
        <div className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap">
          {snapshotText && snapshotText.trim()
            ? snapshotText
            : 'Snapshot text not yet generated.'}
        </div>
      </div>

      {/* Open Decisions (from active tensions) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))]">
            Open Decisions
          </h2>
          <Link
            href={`/projects/${projectId}/decisions?tab=decisions`}
            className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
          >
            View
          </Link>
        </div>
        {openDecisions.length > 0 ? (
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
        ) : (
          <p className="text-sm text-[rgb(var(--muted))]">No unresolved decisions.</p>
        )}
      </div>

      {/* Open Tasks (tasks that still carry weight) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))]">
            Open Tasks
          </h2>
          <Link
            href={`/projects/${projectId}/tasks?tab=tasks`}
            className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
          >
            View
          </Link>
        </div>
        {totalOpenTasks > 0 ? (
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
        ) : (
          <p className="text-sm text-[rgb(var(--muted))]">No open tasks.</p>
        )}
      </div>

      {/* Motion Timeline (snapshot-based, horizontal) */}
      <HorizontalSnapshotTimeline snapshots={projectSnapshots} />

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

type SnapshotTimelineItem = {
  id: string;
  position: number;
  dateLabel: string;
  summary: string;
};

function buildSnapshotTimelineItems(
  snapshots: Array<{
    id: string;
    generated_at: string | null;
    snapshot_text: string | null;
    state_payload: any | null;
  }>
): SnapshotTimelineItem[] {
  const withTime = snapshots
    .map((s) => {
      const tsString = s.generated_at;
      if (!tsString) return null;
      const ts = new Date(tsString);
      if (Number.isNaN(ts.getTime())) return null;
      return { ...s, ts };
    })
    .filter((s): s is typeof snapshots[number] & { ts: Date } => !!s);

  if (withTime.length === 0) return [];

  withTime.sort((a, b) => a.ts.getTime() - b.ts.getTime());

  const first = withTime[0]!;
  const last = withTime[withTime.length - 1]!;
  const t0 = first.ts.getTime();
  const tN = last.ts.getTime();
  const span = tN - t0 || 1;

  return withTime.map((s) => {
    const pos = span === 0 ? 0.5 : (s.ts.getTime() - t0) / span;
    const dateLabel = s.ts.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    let summary = 'Snapshot';
    const text = (s.snapshot_text || '').trim();
    if (text) {
      const firstLine = text.split('\n')[0] ?? text;
      summary =
        firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
    } else if (s.state_payload) {
      const payload = s.state_payload as {
        active_arc_ids?: string[];
        decision_density_bucket?: number;
        result_density_bucket?: number;
      };
      const arcCount = Array.isArray(payload.active_arc_ids)
        ? payload.active_arc_ids.length
        : 0;
      const decisionBucket =
        typeof payload.decision_density_bucket === 'number'
          ? payload.decision_density_bucket
          : null;
      const resultBucket =
        typeof payload.result_density_bucket === 'number'
          ? payload.result_density_bucket
          : null;

      const parts: string[] = [];
      if (arcCount > 0) parts.push(`${arcCount} active arcs`);
      if (decisionBucket !== null)
        parts.push(`Decision density ${decisionBucket}`);
      if (resultBucket !== null)
        parts.push(`Result density ${resultBucket}`);
      if (parts.length > 0) {
        summary = parts.join(' · ');
      }
    }

    return {
      id: s.id,
      position: pos,
      dateLabel,
      summary,
    };
  });
}

function HorizontalSnapshotTimeline(props: {
  snapshots: ReadTabProps['projectSnapshots'];
}) {
  const items = buildSnapshotTimelineItems(props.snapshots);
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
        Motion Timeline
      </h2>
      <div className="relative h-12">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-[rgb(var(--ring)/0.12)]" />
        {items.map((item) => (
          <div
            key={item.id}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${item.position * 100}%` }}
          >
            <div className="group relative">
              <div className="h-2 w-2 rounded-full bg-[rgb(var(--text))]" />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="max-w-xs rounded-md border border-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] px-2 py-1 shadow-sm">
                  <div className="text-[10px] font-medium text-[rgb(var(--text))]">
                    {item.dateLabel}
                  </div>
                  <div className="mt-1 text-[10px] text-[rgb(var(--muted))] whitespace-pre-line">
                    {item.summary}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
