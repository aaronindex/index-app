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
import Pill from '@/app/components/ui/Pill';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'complete' | 'cancelled' | 'dormant' | 'priority';
  conversation_title: string | null;
  conversation_id: string | null;
  created_at: string;
  is_inactive?: boolean;
}

interface TasksTabProps {
  tasks: Task[];
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'complete' | 'priority' | 'dormant' | 'cancelled';
type ActiveFilter = 'active' | 'all' | 'inactive';

export default function TasksTab({ tasks }: TasksTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'cancelled':
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'in_progress':
        return 'In Progress';
      case 'cancelled':
        return 'Cancelled';
      case 'priority':
        return 'Priority';
      case 'dormant':
        return 'Dormant';
      default:
        return 'Open';
    }
  };

  const filteredTasks = statusFilter === 'all' 
    ? filteredByActive 
    : filteredByActive.filter((task) => task.status === statusFilter);

  const statusCounts = {
    all: tasks.length,
    open: tasks.filter((t) => t.status === 'open').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    complete: tasks.filter((t) => t.status === 'complete').length,
    priority: tasks.filter((t) => t.status === 'priority').length,
    dormant: tasks.filter((t) => t.status === 'dormant').length,
    cancelled: tasks.filter((t) => t.status === 'cancelled').length,
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

      {/* Status Filters */}
      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'in_progress', 'complete', 'priority', 'dormant', 'cancelled'] as StatusFilter[]).map((filter) => (
            <Pill
              key={filter}
              active={statusFilter === filter}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === 'all' ? 'All' : getStatusLabel(filter)} ({statusCounts[filter]})
            </Pill>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[rgb(var(--muted))]">
            {tasks.length === 0
              ? 'No tasks in this project yet.'
              : `No tasks with status "${getStatusLabel(statusFilter)}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

