// app/projects/[id]/components/TasksTab.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import TaskStartChatButton from './TaskStartChatButton';
import TaskStatusControl from './TaskStatusControl';
import DeleteTaskButton from './DeleteTaskButton';
import ActiveFilterPills from './ActiveFilterPills';
import ToggleInactiveButton from './ToggleInactiveButton';
import Card from '@/app/components/ui/Card';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'complete' | 'cancelled' | 'dormant' | 'priority';
  horizon: 'this_week' | 'this_month' | 'later' | null;
  conversation_title: string | null;
  conversation_id: string | null;
  created_at: string;
  is_inactive?: boolean;
}

interface TasksTabProps {
  tasks: Task[];
}

type ActiveFilter = 'active' | 'all' | 'inactive';
type DisplayStatus = 'open' | 'priority' | 'complete';

// Map all statuses to 3 display buckets
const getDisplayStatus = (status: string): DisplayStatus => {
  if (status === 'priority') return 'priority';
  if (status === 'complete' || status === 'cancelled') return 'complete';
  return 'open'; // open, in_progress, dormant all map to 'open'
};

export default function TasksTab({ tasks }: TasksTabProps) {
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

  // Group tasks by horizon and status
  const groupedTasks = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + (7 - now.getDay())); // End of this week (Sunday)
    const monthEnd = new Date(now);
    monthEnd.setMonth(now.getMonth() + 1);
    monthEnd.setDate(0); // Last day of this month

    const groups: {
      thisWeek: Task[];
      thisMonth: Task[];
      later: Task[];
      complete: Task[];
    } = {
      thisWeek: [],
      thisMonth: [],
      later: [],
      complete: [],
    };

    filteredByActive.forEach((task) => {
      const displayStatus = getDisplayStatus(task.status);
      
      if (displayStatus === 'complete') {
        groups.complete.push(task);
        return;
      }

      // Use horizon if set, otherwise infer from created_at
      let horizon = task.horizon;
      if (!horizon) {
        const taskDate = new Date(task.created_at);
        if (taskDate <= weekEnd) {
          horizon = 'this_week';
        } else if (taskDate <= monthEnd) {
          horizon = 'this_month';
        } else {
          horizon = 'later';
        }
      }

      if (horizon === 'this_week') {
        groups.thisWeek.push(task);
      } else if (horizon === 'this_month') {
        groups.thisMonth.push(task);
      } else {
        groups.later.push(task);
      }
    });

    // Sort each group: Priority first, then by created_at
    const sortTasks = (a: Task, b: Task) => {
      if (a.status === 'priority' && b.status !== 'priority') return -1;
      if (a.status !== 'priority' && b.status === 'priority') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };

    groups.thisWeek.sort(sortTasks);
    groups.thisMonth.sort(sortTasks);
    groups.later.sort(sortTasks);
    groups.complete.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return groups;
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

  const hasTasks = groupedTasks.thisWeek.length > 0 || 
                   groupedTasks.thisMonth.length > 0 || 
                   groupedTasks.later.length > 0 || 
                   groupedTasks.complete.length > 0;

  const renderTaskCard = (task: Task) => (
    <Card
      key={task.id}
      className={task.is_inactive ? 'opacity-60' : ''}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 flex items-center gap-2">
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

      {!hasTasks ? (
        <div className="text-center py-12">
          <p className="text-[rgb(var(--muted))]">
            {tasks.length === 0
              ? 'No tasks in this project yet.'
              : 'No active tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* This Week */}
          {groupedTasks.thisWeek.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">This Week</h3>
              <div className="space-y-3">
                {groupedTasks.thisWeek.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* This Month */}
          {groupedTasks.thisMonth.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">This Month</h3>
              <div className="space-y-3">
                {groupedTasks.thisMonth.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Later */}
          {groupedTasks.later.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">Later</h3>
              <div className="space-y-3">
                {groupedTasks.later.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Complete */}
          {groupedTasks.complete.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">Complete</h3>
              <div className="space-y-3">
                {groupedTasks.complete.map(renderTaskCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

