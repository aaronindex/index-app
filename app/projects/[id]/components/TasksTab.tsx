// app/projects/[id]/components/TasksTab.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import TaskStartChatButton from './TaskStartChatButton';
import TaskStatusControl from './TaskStatusControl';
import DeleteTaskButton from './DeleteTaskButton';
import ActiveFilterPills from './ActiveFilterPills';
import ToggleInactiveButton from './ToggleInactiveButton';
import PinTaskButton from './PinTaskButton';
import TaskReorderControls from './TaskReorderControls';
import Card from '@/app/components/ui/Card';

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

export default function TasksTab({ tasks, projectId }: TasksTabProps) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');

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
      // Pinned tasks first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      // If both pinned or both unpinned, sort by sort_order
      if (a.is_pinned && b.is_pinned) {
        if (a.sort_order !== null && b.sort_order !== null) {
          return a.sort_order - b.sort_order;
        }
        if (a.sort_order !== null) return -1;
        if (b.sort_order !== null) return 1;
      }

      // For unpinned tasks, also consider sort_order if set
      if (!a.is_pinned && !b.is_pinned) {
        if (a.sort_order !== null && b.sort_order !== null) {
          return a.sort_order - b.sort_order;
        }
      }

      // Then by status: priority first
      const aStatus = getDisplayStatus(a.status);
      const bStatus = getDisplayStatus(b.status);
      if (aStatus === 'priority' && bStatus !== 'priority') return -1;
      if (aStatus !== 'priority' && bStatus === 'priority') return 1;

      // Finally by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredByActive]);

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
    const canMoveUp = index > 0;
    const canMoveDown = index < sortedTasks.length - 1;

    return (
      <Card
        key={task.id}
        className={task.is_inactive ? 'opacity-60' : ''}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 flex items-center gap-2">
              <PinTaskButton
                taskId={task.id}
                isPinned={task.is_pinned || false}
                projectId={projectId}
              />
              <TaskReorderControls
                taskId={task.id}
                projectId={projectId}
                currentOrder={task.sort_order}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
              />
              <h3 className="font-medium text-[rgb(var(--text))]">{task.title}</h3>
              {task.is_inactive && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]">
                  Inactive
                </span>
              )}
            </div>
            <TaskStatusControl taskId={task.id} currentStatus={task.status} />
          </div>
          {task.description && (
            <p className="text-[rgb(var(--text))] mb-3 text-sm">
              {task.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-[rgb(var(--muted))]">
              {task.conversation_id && task.conversation_title ? (
                <Link
                  href={`/conversations/${task.conversation_id}`}
                  className="hover:text-[rgb(var(--text))] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  From: {task.conversation_title}
                </Link>
              ) : (
                <span>Created: {formatDate(task.created_at)}</span>
              )}
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <ToggleInactiveButton
                type="task"
                id={task.id}
                isInactive={task.is_inactive || false}
              />
              <TaskStartChatButton taskId={task.id} />
              <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Active/Inactive Filter */}
      {tasks.length > 0 && (
        <ActiveFilterPills
          activeCount={activeTasks.length}
          inactiveCount={inactiveTasks.length}
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
          {sortedTasks.map((task, index) => renderTaskCard(task, index))}
        </div>
      )}
    </div>
  );
}

