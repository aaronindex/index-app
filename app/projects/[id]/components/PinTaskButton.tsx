// app/projects/[id]/components/PinTaskButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

interface PinTaskButtonProps {
  taskId: string;
  isPinned: boolean;
  projectId: string;
}

export default function PinTaskButton({ taskId, isPinned, projectId }: PinTaskButtonProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const handleToggle = async () => {
    if (updating) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/tasks/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, pinned: !isPinned }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to pin task');
      }

      // Track analytics
      trackEvent('task_pinned', {
        task_id: taskId,
        project_id: projectId,
        pinned: !isPinned,
      });

      router.refresh();
    } catch (err) {
      console.error('Failed to pin task:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={updating}
      className="p-1.5 rounded hover:bg-[rgb(var(--surface2))] transition-colors disabled:opacity-50"
      title={isPinned ? 'Unpin task' : 'Pin task'}
    >
      {isPinned ? (
        <span className="text-lg">📌</span>
      ) : (
        <span className="text-lg opacity-40">📌</span>
      )}
    </button>
  );
}

