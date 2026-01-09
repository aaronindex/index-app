// app/projects/[id]/components/TaskReorderControls.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

interface TaskReorderControlsProps {
  taskId: string;
  projectId: string;
  currentOrder: number | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export default function TaskReorderControls({
  taskId,
  projectId,
  currentOrder,
  canMoveUp,
  canMoveDown,
}: TaskReorderControlsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const handleMove = async (direction: 'up' | 'down') => {
    if (updating) return;

    const newOrder = currentOrder === null 
      ? (direction === 'up' ? 0 : 1)
      : (direction === 'up' ? currentOrder - 1 : currentOrder + 1);

    setUpdating(true);
    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, projectId, newOrder }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reorder task');
      }

      // Track analytics
      trackEvent('task_reordered', {
        task_id: taskId,
        project_id: projectId,
        new_order: newOrder,
        direction,
      });

      router.refresh();
    } catch (err) {
      console.error('Failed to reorder task:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleMove('up')}
        disabled={updating || !canMoveUp}
        className="p-1 rounded hover:bg-[rgb(var(--surface2))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Move up"
      >
        <span className="text-sm">↑</span>
      </button>
      <button
        onClick={() => handleMove('down')}
        disabled={updating || !canMoveDown}
        className="p-1 rounded hover:bg-[rgb(var(--surface2))] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Move down"
      >
        <span className="text-sm">↓</span>
      </button>
    </div>
  );
}

