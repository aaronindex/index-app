// app/projects/[id]/components/TaskStatusControl.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type TaskStatus = 'open' | 'in_progress' | 'complete' | 'cancelled' | 'dormant' | 'priority';

interface TaskStatusControlProps {
  taskId: string;
  currentStatus: TaskStatus;
}

// Map internal statuses to 3 display statuses
const getDisplayStatus = (status: TaskStatus): 'open' | 'priority' | 'complete' => {
  if (status === 'priority') return 'priority';
  if (status === 'complete' || status === 'cancelled') return 'complete';
  return 'open'; // open, in_progress, dormant all map to 'open'
};

// Map display status back to internal status (preserve original if possible)
const getInternalStatus = (displayStatus: 'open' | 'priority' | 'complete', currentStatus: TaskStatus): TaskStatus => {
  if (displayStatus === 'priority') return 'priority';
  if (displayStatus === 'complete') {
    // If currently complete or cancelled, keep cancelled; otherwise set to complete
    return currentStatus === 'cancelled' ? 'cancelled' : 'complete';
  }
  // For 'open', preserve in_progress or dormant if they were set, otherwise use open
  if (currentStatus === 'in_progress' || currentStatus === 'dormant') {
    return currentStatus;
  }
  return 'open';
};

const STATUS_OPTIONS: Array<{ value: 'open' | 'priority' | 'complete'; label: string; color: string }> = [
  { value: 'open', label: 'Open', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' },
  { value: 'priority', label: 'Priority', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' },
  { value: 'complete', label: 'Complete', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' },
];

export default function TaskStatusControl({ taskId, currentStatus }: TaskStatusControlProps) {
  const router = useRouter();
  const [displayStatus, setDisplayStatus] = useState<'open' | 'priority' | 'complete'>(getDisplayStatus(currentStatus));
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newDisplayStatus: 'open' | 'priority' | 'complete') => {
    if (newDisplayStatus === displayStatus) return;

    const newInternalStatus = getInternalStatus(newDisplayStatus, currentStatus);

    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/update-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newInternalStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      setDisplayStatus(newDisplayStatus);
      router.refresh();
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert on error
      setDisplayStatus(getDisplayStatus(currentStatus));
    } finally {
      setUpdating(false);
    }
  };

  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === displayStatus);

  return (
    <div className="relative">
      <select
        value={displayStatus}
        onChange={(e) => handleStatusChange(e.target.value as 'open' | 'priority' | 'complete')}
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

