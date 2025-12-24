// app/projects/[id]/components/TasksTab.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import TaskStartChatButton from './TaskStartChatButton';
import TaskStatusControl from './TaskStatusControl';
import DeleteTaskButton from './DeleteTaskButton';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'complete' | 'cancelled' | 'dormant' | 'priority';
  conversation_title: string | null;
  conversation_id: string | null;
  created_at: string;
}

interface TasksTabProps {
  tasks: Task[];
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'complete' | 'priority' | 'dormant' | 'cancelled';

export default function TasksTab({ tasks }: TasksTabProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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
    ? tasks 
    : tasks.filter((task) => task.status === statusFilter);

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
      {/* Status Filters */}
      {tasks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(['all', 'open', 'in_progress', 'complete', 'priority', 'dormant', 'cancelled'] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                ${
                  statusFilter === filter
                    ? 'bg-foreground text-background'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
            >
              {filter === 'all' ? 'All' : getStatusLabel(filter)} ({statusCounts[filter]})
            </button>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400">
            {tasks.length === 0
              ? 'No tasks in this project yet.'
              : `No tasks with status "${getStatusLabel(statusFilter)}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-foreground flex-1">{task.title}</h3>
                <TaskStatusControl taskId={task.id} currentStatus={task.status} />
              </div>
              {task.description && (
                <p className="text-zinc-700 dark:text-zinc-300 mb-3 text-sm">
                  {task.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {task.conversation_id && task.conversation_title ? (
                    <Link
                      href={`/conversations/${task.conversation_id}`}
                      className="hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      From: {task.conversation_title}
                    </Link>
                  ) : (
                    <span>Created: {formatDate(task.created_at)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <TaskStartChatButton taskId={task.id} />
                  <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

