// app/projects/[id]/components/CreateDecisionButton.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CreateDecisionButtonProps {
  projectId: string;
  conversationId?: string | null;
}

export default function CreateDecisionButton({ projectId, conversationId }: CreateDecisionButtonProps) {
  const router = useRouter();
  const createInFlightRef = useRef(false);
  const createTimeoutRef = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
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
      const response = await fetch('/api/decisions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || null,
          conversation_id: conversationId || null,
          project_id: projectId,
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
        const errMsg = typeof data.error === 'string' ? data.error : 'Failed to create decision';
        setError(errMsg);
        return;
      }

      const decision = data.decision as { id: string } | undefined;
      if (decision?.id) {
        const { trackEvent } = await import('@/lib/analytics');
        trackEvent('decision_created', { decision_id: decision.id, has_project: !!projectId });
      }
      setTitle('');
      setContent('');
      setShowModal(false);
      router.refresh();
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
              : 'Failed to create decision'
      );
    } finally {
      createInFlightRef.current = false;
      setCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
      >
        Create Decision
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-950 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-foreground mb-4">Create Decision</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What decision was made?"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-foreground mb-1">
                  Details (optional)
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Add context, reasoning, or details about this decision..."
                  rows={4}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setTitle('');
                    setContent('');
                    setError(null);
                  }}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !title.trim()}
                  className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

