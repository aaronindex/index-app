// app/projects/[id]/components/ReadTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showSuccess } from '@/app/components/ErrorNotification';

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
  projectTimelineEvents?: Array<{
    id: string;
    occurred_at: string;
    kind: 'pulse' | 'result';
    label: string;
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
  projectTimelineEvents = [],
  latestSnapshotOutcomeText,
  sourceCount,
}: ReadTabProps) {
  const router = useRouter();
  const [stillUnfolding, setStillUnfolding] = useState<StillUnfoldingItem[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([]);
  const [nextTasks, setNextTasks] = useState<NextTask[]>([]);
  const [hasConversations, setHasConversations] = useState<boolean | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeText, setOutcomeText] = useState('');
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [outcomeSavedAndClosing, setOutcomeSavedAndClosing] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);

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
            Distill your first source
          </h3>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Once a source is imported, INDEX distills it into structure.
            <br />
            Arcs, decisions, and open loops will appear here as the project takes shape.
          </p>
          <button
            onClick={() => router.push(`/import?project=${projectId}`)}
            className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity"
          >
            Import source
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
      <div className="border border-[rgb(var(--ring)/0.08)] rounded-lg px-4 py-2.5 mt-1 mb-6">
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="text-sm font-medium text-[rgb(var(--text))]">
            {typeof sourceCount === 'number' && sourceCount > 0
              ? `Distilled from ${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`
              : 'Distilled'}
          </div>
          {typeof sourceCount === 'number' && sourceCount > 0 && (
            <div className="text-base leading-none">↓</div>
          )}
          <div className="text-xs text-[rgb(var(--text))] font-medium">
            <span className="font-semibold">{decisionsCount}</span>{' '}
            {decisionsCount === 1 ? 'decision' : 'decisions'}
            {' · '}
            <span className="font-semibold">{tasksCount}</span>{' '}
            {tasksCount === 1 ? 'task' : 'tasks'}
            {' · '}
            <span className="font-semibold">{arcsCount}</span>{' '}
            {arcsCount === 1 ? 'arc' : 'arcs'}
          </div>
        </div>
      </div>

      {/* Active Arcs */}
      <div>
        <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
          Active Arcs
        </h2>
        {activeArcs.length > 0 ? (
          <ul className="space-y-1 text-sm text-[rgb(var(--text))]">
            {activeArcs.map((arc, index) => {
              const label = arc.title || `Arc ${index + 1}`;
              return <li key={arc.id}>{label}</li>;
            })}
          </ul>
        ) : (
          <p className="text-sm text-[rgb(var(--muted))]">No active arcs.</p>
        )}
      </div>

      {/* Snapshot */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))]">
            Project Snapshot
          </h2>
          <button
            type="button"
            onClick={() => {
              setOutcomeText('');
              setOutcomeError(null);
              setShowOutcomeModal(true);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded border border-[rgb(var(--ring)/0.16)] text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] transition-colors"
          >
            Record result
          </button>
        </div>
        <div className="border border-[rgb(var(--ring)/0.08)] rounded-lg p-4">
          {snapshotUpdatedLabel && (
            <p className="text-xs text-[rgb(var(--muted))] mb-2">{snapshotUpdatedLabel}</p>
          )}
          <div className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap space-y-1">
            {latestSnapshotOutcomeText && latestSnapshotOutcomeText.trim().length > 0 && (
              <p className="font-medium">{latestSnapshotOutcomeText.trim()}</p>
            )}
            <p>
              {arcsCount === 0
                ? 'No arcs active.'
                : arcsCount === 1
                ? 'One arc active.'
                : `${arcsCount} arcs active.`}
            </p>
            <p>Exploration ongoing.</p>
            <p>
              {decisionsCount === 0
                ? 'No unresolved decisions.'
                : decisionsCount === 1
                ? 'One unresolved decision.'
                : `${decisionsCount} unresolved decisions.`}
            </p>
          </div>
        </div>
      </div>

      {showOutcomeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (!outcomeSaving && !outcomeSavedAndClosing) {
              setShowOutcomeModal(false);
              setOutcomeError(null);
            }
          }}
        >
          <div
            className="bg-[rgb(var(--surface))] rounded-2xl p-6 max-w-md w-full shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-2">
              Record result
            </h3>
            <p className="text-xs text-[rgb(var(--muted))] mb-4">
              Recording an outcome updates the structural state of this project. This cannot be edited.
            </p>
            <textarea
              value={outcomeText}
              onChange={(e) => setOutcomeText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-[rgb(var(--ring)/0.16)] rounded-lg bg-[rgb(var(--bg))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
              placeholder="Summarize a concrete result in a single sentence..."
              disabled={outcomeSaving || outcomeSavedAndClosing}
            />
            {outcomeError && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                {outcomeError}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (outcomeSaving || outcomeSavedAndClosing) return;
                  setShowOutcomeModal(false);
                  setOutcomeError(null);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[rgb(var(--ring)/0.16)] text-[rgb(var(--muted))] hover:bg-[rgb(var(--surface2))] disabled:opacity-50"
                disabled={outcomeSaving || outcomeSavedAndClosing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const text = outcomeText.trim();
                  if (!text) {
                    setOutcomeError('Outcome text is required.');
                    return;
                  }
                  setOutcomeSaving(true);
                  setOutcomeError(null);
                  try {
                    const response = await fetch(`/api/projects/${projectId}/outcomes`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text }),
                    });

                    const bodyText = await response.text();
                    let json: any = {};
                    try {
                      json = bodyText.trim() ? JSON.parse(bodyText) : {};
                    } catch {
                      throw new Error('Invalid response from server. Please try again.');
                    }

                    if (!response.ok) {
                      const message =
                        typeof json.error === 'string'
                          ? json.error
                          : 'Failed to record outcome.';
                      setOutcomeError(message);
                      return;
                    }

                    setOutcomeSaving(false);
                    setOutcomeSavedAndClosing(true);
                    setTimeout(() => {
                      setShowOutcomeModal(false);
                      setOutcomeText('');
                      setOutcomeSavedAndClosing(false);
                      router.refresh();
                      showSuccess('Result recorded.');
                    }, 800);
                  } catch (err) {
                    setOutcomeError(
                      err instanceof Error ? err.message : 'Failed to record outcome.'
                    );
                  } finally {
                    setOutcomeSaving(false);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgb(var(--text))] text-[rgb(var(--bg))] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={outcomeSaving || outcomeSavedAndClosing || !outcomeText.trim()}
              >
                {outcomeSavedAndClosing ? 'Saved' : outcomeSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            View all decisions
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

      <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

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
            View all tasks
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

      <hr className="my-6 border-[rgb(var(--ring)/0.08)]" />

      {/* Project timeline: pulses + results (events with labels) */}
      <ProjectEventTimeline events={projectTimelineEvents} />

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

type ProjectTimelineEvent = {
  id: string;
  occurred_at: string;
  kind: 'pulse' | 'result';
  label: string;
};

function ProjectEventTimeline(props: { events: ProjectTimelineEvent[] }) {
  const events = props.events
    .map((e) => {
      const ts = new Date(e.occurred_at).getTime();
      if (Number.isNaN(ts)) return null;
      return { ...e, ts };
    })
    .filter((e): e is ProjectTimelineEvent & { ts: number } => e !== null)
    .sort((a, b) => a.ts - b.ts);

  if (events.length === 0) return null;

  const first = events[0]!;
  const last = events[events.length - 1]!;
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
        {events.map((item) => {
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
                    item.kind === 'result' ? 'h-3 w-3' : 'h-2 w-2'
                  }`}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="max-w-[260px] min-w-[180px] rounded-md border border-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] px-2 py-1 shadow-sm font-sans">
                    <div className="text-[10px] font-medium text-[rgb(var(--text))]">
                      {dateLabel}
                    </div>
                    <div className="mt-1 text-[10px] text-[rgb(var(--muted))] whitespace-normal break-words">
                      {item.label}
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
