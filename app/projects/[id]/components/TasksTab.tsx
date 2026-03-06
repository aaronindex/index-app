// app/projects/[id]/components/TasksTab.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
// Start chat is reserved for project-level re-entry; no per-task start chat.
import DeleteTaskButton from './DeleteTaskButton';
import TaskStatusControl from './TaskStatusControl';
import ActiveFilterPills from './ActiveFilterPills';
import ToggleInactiveButton from './ToggleInactiveButton';
// Pinning and manual reorder are intentionally removed to keep Tasks lightweight.
import Card from '@/app/components/ui/Card';
import CreateTaskButton from './CreateTaskButton';
import SectionHeader from '@/app/components/ui/SectionHeader';
import SignalContextToggle from '@/app/components/ui/SignalContextToggle';

interface Task {
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
}

interface TasksTabProps {
  tasks: Task[];
  projectId: string;
}

type ActiveFilter = 'active' | 'all' | 'inactive';
type DisplayStatus = 'open' | 'priority' | 'complete';

// Map all statuses to 3 display buckets
const getDisplayStatus = (status: string): DisplayStatus => {
  if (status === 'priority') return 'priority';
  if (status === 'complete' || status === 'cancelled') return 'complete';
  return 'open'; // open, in_progress, dormant all map to 'open'
};

const INITIAL_VISIBLE = 4;

export default function TasksTab({ tasks, projectId }: TasksTabProps) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [sectionExpanded, setSectionExpanded] = useState(false);

  const { activeTasks, inactiveTasks } = useMemo(() => {
    const active = tasks.filter((t) => !t.is_inactive);
    const inactive = tasks.filter((t) => t.is_inactive);
    return { activeTasks: active, inactiveTasks: inactive };
  }, [tasks]);

  const filteredByActive = useMemo(() => {
    if (activeFilter === 'active') return activeTasks;
    if (activeFilter === 'inactive') return inactiveTasks;
    return [...activeTasks, ...inactiveTasks];
  }, [activeFilter, activeTasks, inactiveTasks]);

  // Sort tasks: pinned first, then by sort_order, then by status (priority first), then by created_at
  // No horizon grouping - tasks are displayed in a single list
  const sortedTasks = useMemo(() => {
    return [...filteredByActive].sort((a, b) => {
      // By status: priority first
      const aStatus = getDisplayStatus(a.status);
      const bStatus = getDisplayStatus(b.status);
      if (aStatus === 'priority' && bStatus !== 'priority') return -1;
      if (aStatus !== 'priority' && bStatus === 'priority') return 1;

      // Then by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredByActive]);

  const visibleTasks = sectionExpanded ? sortedTasks : sortedTasks.slice(0, INITIAL_VISIBLE);
  const hasMoreTasks = sortedTasks.length > INITIAL_VISIBLE;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const getStatusColor = (status: string) => {
    const displayStatus = getDisplayStatus(status);
    switch (displayStatus) {
      case 'complete':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'priority':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
    }
  };

  const getStatusLabel = (status: string) => {
    return getDisplayStatus(status).charAt(0).toUpperCase() + getDisplayStatus(status).slice(1);
  };

  // Extract project ID - all tasks in this tab belong to the same project
  // projectId is passed as prop from the parent page

  const renderTaskCard = (task: Task, index: number) => {
    // Detect task type from description prefix
    const isCommitment = task.description?.includes('[Commitment]');
    const isBlocker = task.description?.includes('[Blocker]');
    const isOpenLoop = task.description?.includes('[Open Loop]');
    
    // Determine badge color and label
    let badgeColor = '';
    let badgeLabel = '';
    if (isCommitment) {
      badgeColor = 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]';
      badgeLabel = 'Commitment';
    } else if (isBlocker) {
      badgeColor = 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]';
      badgeLabel = 'Blocker';
    } else if (isOpenLoop) {
      badgeColor = 'bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]';
      badgeLabel = 'Open Loop';
    }

    // Clean description (remove prefix for display)
    const cleanDescription = task.description
      ?.replace(/^\[Commitment\]\s*/, '')
      .replace(/^\[Blocker\]\s*/, '')
      .replace(/^\[Open Loop\]\s*/, '')
      .trim();

    return (
      <Card
        key={task.id}
        className={`group ${task.is_inactive ? 'opacity-60' : ''}`}
      >
        <div className="p-3">
          <div className="flex items-start justify-between mb-0.5">
            <div className="flex-1 min-w-0">
              <p className="text-[0.7em] uppercase tracking-wider text-[rgb(var(--muted))] opacity-80 leading-tight mb-0.5">
                Task
              </p>
              <h3 className="font-semibold text-[rgb(var(--text))] text-sm sm:text-base leading-snug">
                {task.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {badgeLabel && (
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${badgeColor}`}>
                  {badgeLabel}
                </span>
              )}
              {task.is_inactive && (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]">
                  Inactive
                </span>
              )}
            </div>
          </div>
          <SignalContextToggle context={cleanDescription ?? null} />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-[11px] text-[rgb(var(--muted))] opacity-80 min-w-0">
              {task.conversation_id && task.conversation_title ? (
                <Link
                  href={`/conversations/${task.conversation_id}`}
                  className="hover:text-[rgb(var(--text))] transition-colors truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  From: {task.conversation_title}
                </Link>
              ) : (
                <span>Created: {formatDate(task.created_at)}</span>
              )}
            </div>
            <div
              className="flex items-center gap-2 shrink-0 text-xs text-[rgb(var(--muted))] opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <TaskStatusControl taskId={task.id} currentStatus={task.status} />
              <ToggleInactiveButton
                type="task"
                id={task.id}
                isInactive={task.is_inactive || false}
              />
              <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader compact action={<CreateTaskButton projectId={projectId} />}>
        Tasks
      </SectionHeader>

      {/* Active/Inactive Filter */}
      {tasks.length > 0 && (
        <ActiveFilterPills
          activeCount={activeTasks.length}
          inactiveCount={inactiveTasks.length}
          activeLabel="Open"
          onFilterChange={setActiveFilter}
        />
      )}

      {sortedTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[rgb(var(--muted))]">
            {tasks.length === 0
              ? 'No tasks in this project yet.'
              : 'No active tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task, index) => renderTaskCard(task, index))}
          {hasMoreTasks && (
            <button
              type="button"
              onClick={() => setSectionExpanded((v) => !v)}
              className="text-sm font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              {sectionExpanded ? 'Show less' : `Show all (${sortedTasks.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

