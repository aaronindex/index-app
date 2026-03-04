// app/conversations/[id]/components/CreateTaskFromHighlightButton.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CreateTaskFromHighlightButtonProps {
  highlightId: string;
  highlightContent: string;
  conversationId: string;
  projectId: string | null;
}

export default function CreateTaskFromHighlightButton({
  highlightId,
  highlightContent,
  conversationId,
  projectId,
}: CreateTaskFromHighlightButtonProps) {
  const router = useRouter();
  const createInFlightRef = useRef(false);
  const createTimeoutRef = useRef(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!projectId) {
      setError('Link conversation to a project first');
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
          title: highlightContent.substring(0, 100),
          description: highlightContent,
          project_id: projectId,
          conversation_id: conversationId,
          source_highlight_id: highlightId,
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
        setError('Invalid response from server. Please try again.');
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          const { trackEvent } = await import('@/lib/analytics');
          trackEvent('limit_hit', { limit_type: 'meaning_object' });
        }
        setError(typeof data.error === 'string' ? data.error : 'Failed to create task');
        return;
      }

      const task = data.task as { id: string } | undefined;
      if (task?.id) {
        const { trackEvent } = await import('@/lib/analytics');
        trackEvent('task_created', { task_id: task.id, has_project: !!projectId, from_highlight: true });
      }
      router.push(`/projects/${projectId}?tab=tasks`);
    } catch (err) {
      if (timeoutId != null) clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isTimeout = isAbort && createTimeoutRef.current;
      setError(
        isTimeout
          ? 'Request took too long. Try again.'
          : isAbort
            ? 'Request was canceled. Try again.'
            : err instanceof Error
              ? err.message
              : 'Failed to create task'
      );
    } finally {
      createInFlightRef.current = false;
      setCreating(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCreate}
        disabled={creating || !projectId}
        className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={!projectId ? 'Link conversation to a project first' : 'Create task from this highlight'}
      >
        {creating ? 'Creating...' : 'Create Task'}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}

