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
  const createInFlightRef = useRef(false);
  const createTimeoutRef = useRef(false);

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
    if (createInFlightRef.current) return;
    createInFlightRef.current = true;
    setCreating(true);
    setError(null);

    const abortController = new AbortController();
    const timeoutMs = 60_000;
    createTimeoutRef.current = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      createTimeoutRef.current = true;
      abortController.abort();
    }, timeoutMs);

    try {
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          project_id: projectId,
          status: 'open',
        }),
        signal: abortController.signal,
      });
      if (timeoutId != null) clearTimeout(timeoutId);

      const text = await response.text();
      let data: Record<string, unknown>;
      try {
        data = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        showError('Invalid response from server. Please try again.');
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          const { trackEvent } = await import('@/lib/analytics');
          trackEvent('limit_hit', { limit_type: 'meaning_object' });
          showError(typeof data.error === 'string' ? data.error : 'Task limit reached');
        } else {
          showError(typeof data.error === 'string' ? data.error : 'Failed to create task');
        }
        return;
      }

      const task = data.task as { id: string } | undefined;
      if (task?.id) {
        const { trackEvent } = await import('@/lib/analytics');
        trackEvent('task_created', {
          task_id: task.id,
          has_project: !!projectId,
          from_highlight: false,
          source: 'manual',
        });
      }
      setTitle('');
      setIsCreating(false);
      setError(null);
      showSuccess('Task created');
      if (onTaskCreated) {
        onTaskCreated();
      } else {
        router.refresh();
      }
    } catch (err) {
      if (timeoutId != null) clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isTimeout = isAbort && createTimeoutRef.current;
      const errorMessage = isTimeout
        ? 'Request took too long. Try again.'
        : isAbort
          ? 'Request was canceled. Try again.'
          : err instanceof Error
            ? err.message
            : 'Failed to create task';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      createInFlightRef.current = false;
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

