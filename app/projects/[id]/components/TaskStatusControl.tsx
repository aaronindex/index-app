// app/projects/[id]/components/TaskStatusControl.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type TaskStatus = 'open' | 'in_progress' | 'complete' | 'cancelled' | 'dormant' | 'priority';

interface TaskStatusControlProps {
  taskId: string;
  currentStatus: TaskStatus;
}

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string; color: string }> = [
  { value: 'open', label: 'Open', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' },
  { value: 'complete', label: 'Complete', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' },
  { value: 'priority', label: 'Priority', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' },
  { value: 'dormant', label: 'Dormant', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' },
];

export default function TaskStatusControl({ taskId, currentStatus }: TaskStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus>(currentStatus);
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === status) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/update-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert on error
      setStatus(currentStatus);
    } finally {
      setUpdating(false);
    }
  };

  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === status);

  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
        disabled={updating}
        className={`
          px-2 py-1 text-xs font-medium rounded border border-zinc-300 dark:border-zinc-700
          ${currentOption?.color || ''}
          bg-white dark:bg-zinc-950
          focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
        `}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

