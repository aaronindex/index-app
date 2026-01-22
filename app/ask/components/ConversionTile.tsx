// app/ask/components/ConversionTile.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConversionTileProps {
  type: 'decision' | 'task' | 'clarify_task';
  text: string;
  conversationIds: string[];
  answerContext: string;
  sourceQuery: string;
  askIndexRunId: string | null;
  onConvert: () => void;
}

export default function ConversionTile({
  type,
  text,
  conversationIds,
  answerContext,
  sourceQuery,
  askIndexRunId,
  onConvert,
}: ConversionTileProps) {
  const router = useRouter();
  const [converting, setConverting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeLabels: Record<string, string> = {
    decision: 'Decision',
    task: 'Task',
    clarify_task: 'Clarify Task',
  };

  const typeColors: Record<string, { bg: string; text: string; hover: string }> = {
    decision: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-800 dark:text-purple-400',
      hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/50',
    },
    task: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-400',
      hover: 'hover:bg-green-200 dark:hover:bg-green-900/50',
    },
    clarify_task: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-400',
      hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
    },
  };

  const handleConvert = async (targetType: 'task' | 'decision' | 'highlight') => {
    setConverting(targetType);
    setError(null);

    try {
      const response = await fetch('/api/followups/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: targetType,
          prompt: text,
          conversationIds,
          answerContext,
          sourceQuery,
          ask_index_run_id: askIndexRunId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert');
      }

      const data = await response.json();
      onConvert();

      // Navigate to the created item
      if (targetType === 'task' && data.task) {
        router.push('/projects');
      } else if (targetType === 'decision' && data.decision) {
        router.push('/projects');
      } else if (targetType === 'highlight' && data.highlight) {
        router.push(`/conversations/${data.highlight.conversation_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert');
      setConverting(null);
    }
  };

  const colors = typeColors[type] || typeColors.task;
  const primaryAction = type === 'decision' ? 'decision' : 'task';

  return (
    <div className={`p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 ${colors.bg}`}>
      <div className="flex items-start gap-2 mb-3">
        <span className={`px-2 py-1 text-xs font-semibold rounded-md ${colors.bg} ${colors.text}`}>
          {typeLabels[type]}
        </span>
        <p className="text-sm font-medium text-foreground flex-1">{text}</p>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* Primary CTA */}
        <button
          onClick={() => handleConvert(primaryAction)}
          disabled={converting !== null}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors.bg} ${colors.text} ${colors.hover}`}
        >
          {converting === primaryAction ? 'Creating...' : `Create ${typeLabels[type]}`}
        </button>
        
        {/* Secondary CTAs (minimal) */}
        {primaryAction !== 'task' && (
          <button
            onClick={() => handleConvert('task')}
            disabled={converting !== null}
            className="px-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting === 'task' ? 'Creating...' : 'As Task'}
          </button>
        )}
        {primaryAction !== 'decision' && (
          <button
            onClick={() => handleConvert('decision')}
            disabled={converting !== null}
            className="px-3 py-2 text-xs bg-zinc-100 dark:bg-zinc-800 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {converting === 'decision' ? 'Creating...' : 'As Decision'}
          </button>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
