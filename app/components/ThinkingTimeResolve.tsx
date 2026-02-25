// app/components/ThinkingTimeResolve.tsx
// Client component for thinking time resolution controls
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ThinkingTimeResolveProps {
  conversationId: string | null;
}

export default function ThinkingTimeResolve({ conversationId }: ThinkingTimeResolveProps) {
  const router = useRouter();
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!conversationId) {
    return null; // No conversation ID available, show badge without controls
  }

  const handleResolve = async (choice: 'today' | 'yesterday' | 'last_week' | 'last_month') => {
    setResolving(true);
    setError(null);

    try {
      const response = await fetch('/api/thinking-time/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          choice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to resolve thinking time');
      }

      // Refresh the page to show updated state
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve thinking time');
      setResolving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs text-yellow-700 dark:text-yellow-500 mb-2">
        Set thinking time:
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleResolve('today')}
          disabled={resolving}
          className="px-3 py-1.5 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => handleResolve('yesterday')}
          disabled={resolving}
          className="px-3 py-1.5 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Yesterday
        </button>
        <button
          onClick={() => handleResolve('last_week')}
          disabled={resolving}
          className="px-3 py-1.5 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Last week
        </button>
        <button
          onClick={() => handleResolve('last_month')}
          disabled={resolving}
          className="px-3 py-1.5 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Last month
        </button>
      </div>
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {resolving && (
        <div className="text-xs text-yellow-700 dark:text-yellow-500">
          Resolving...
        </div>
      )}
    </div>
  );
}
