// app/projects/[id]/components/CreateTaskButton.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface CreateTaskButtonProps {
  projectId: string;
  onTaskCreated?: () => void;
}

export default function CreateTaskButton({ projectId, onTaskCreated }: CreateTaskButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when creating mode is activated
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          project_id: projectId,
          status: 'open',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Track limit hit if 429
        if (response.status === 429) {
          const { trackEvent } = await import('@/lib/analytics');
          trackEvent('limit_hit', {
            limit_type: 'meaning_object',
          });
          showError(errorData.error || 'Task limit reached');
        } else {
          showError(errorData.error || 'Failed to create task');
        }
        
        setCreating(false);
        return;
      }

      const { task } = await response.json();
      
      // Track task created
      const { trackEvent } = await import('@/lib/analytics');
      trackEvent('task_created', {
        task_id: task.id,
        has_project: !!projectId,
        from_highlight: false,
        source: 'manual',
      });

      // Reset form
      setTitle('');
      setIsCreating(false);
      setError(null);
      
      showSuccess('Task created');
      
      // Call callback if provided, otherwise refresh
      if (onTaskCreated) {
        onTaskCreated();
      } else {
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTitle('');
      setIsCreating(false);
      setError(null);
    }
  };

  if (isCreating) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter task title..."
            disabled={creating}
            className="flex-1 px-3 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={creating || !title.trim()}
            className="px-3 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Add'}
          </button>
          <button
            onClick={() => {
              setTitle('');
              setIsCreating(false);
              setError(null);
            }}
            disabled={creating}
            className="px-3 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors text-[rgb(var(--text))] text-sm disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsCreating(true)}
      className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
    >
      New Task
    </button>
  );
}

