// app/ask/components/FollowUpQuestion.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StartChatModal from '@/app/components/StartChatModal';
import { generateContextFromSearchResult } from '@/lib/contextGenerator';

interface FollowUpQuestionProps {
  prompt: string;
  conversationIds: string[];
  answerContext: string;
  sourceQuery: string;
  onConvert: () => void;
}

export default function FollowUpQuestion({
  prompt,
  conversationIds,
  answerContext,
  sourceQuery,
  onConvert,
}: FollowUpQuestionProps) {
  const router = useRouter();
  const [converting, setConverting] = useState<string | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (type: 'task' | 'decision' | 'highlight') => {
    setConverting(type);
    setError(null);

    try {
      const response = await fetch('/api/followups/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          prompt,
          conversationIds,
          answerContext,
          sourceQuery,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert');
      }

      const data = await response.json();

      // Show success and navigate/refresh
      onConvert();

      // Navigate to the created item
      if (type === 'task' && data.task) {
        // Navigate to projects page (tasks will be shown there later)
        router.push('/projects');
      } else if (type === 'decision' && data.decision) {
        // Navigate to projects page
        router.push('/projects');
      } else if (type === 'highlight' && data.highlight) {
        router.push(`/conversations/${data.highlight.conversation_id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert');
      setConverting(null);
    }
  };

  const handleStartChat = () => {
    // Start Chat from Ask Index follow-ups is disabled
    // User must convert to Task or Decision first
    alert('Please convert this follow-up into a Task or Decision first, then use Start Chat on that object.');
  };

  return (
    <>
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-foreground mb-3">{prompt}</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleConvert('task')}
            disabled={converting !== null}
            className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {converting === 'task' ? 'Creating...' : 'Create Task'}
          </button>
          <button
            onClick={() => handleConvert('decision')}
            disabled={converting !== null}
            className="px-3 py-1.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {converting === 'decision' ? 'Creating...' : 'Create Decision'}
          </button>
          <button
            onClick={() => handleConvert('highlight')}
            disabled={converting !== null}
            className="px-3 py-1.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {converting === 'highlight' ? 'Creating...' : 'Create Highlight'}
          </button>
          <button
            onClick={handleStartChat}
            disabled={converting !== null}
            className="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed opacity-50"
            title="Convert to Task or Decision first, then use Start Chat on that object"
          >
            Start Chat (convert first)
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>
        )}
      </div>

      {isChatModalOpen && (
        <StartChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          contextBlock={generateContextFromSearchResult({
            chunkContent: answerContext.substring(0, 500),
            conversationTitle: null,
            projectName: undefined,
            query: `${sourceQuery} → ${prompt}`,
          })}
        />
      )}
    </>
  );
}

