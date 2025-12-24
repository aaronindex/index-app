// app/conversations/[id]/components/CreateTaskFromHighlightButton.tsx
'use client';

import { useState } from 'react';
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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!projectId) {
      setError('Link conversation to a project first');
      return;
    }

    setCreating(true);
    setError(null);

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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      // Navigate to project tasks tab
      router.push(`/projects/${projectId}?tab=tasks`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
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

