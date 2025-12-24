// app/projects/[id]/components/DecisionStartChatButton.tsx
'use client';

import { useState } from 'react';
import StartChatModal from '@/app/components/StartChatModal';

interface DecisionStartChatButtonProps {
  decisionId: string;
}

export default function DecisionStartChatButton({ decisionId }: DecisionStartChatButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartChat = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/start-chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originType: 'decision',
          originId: decisionId,
          targetTool: 'chatgpt', // Default, user can change in modal if needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prompt');
      }

      const data = await response.json();
      setPromptText(data.promptText);
      setRunId(data.runId);
      setIsModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: 'copied' | 'harvested' | 'abandoned') => {
    if (!runId) return;

    try {
      await fetch(`/api/start-chat/${runId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (!promptText) {
    return (
      <>
        <button
          onClick={handleStartChat}
          disabled={loading}
          className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed opacity-75"
          title="Stress-test / Re-evaluate this decision"
        >
          {loading ? 'Generating...' : 'Start Chat'}
        </button>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors opacity-75"
        title="View generated prompt"
      >
        Start Chat
      </button>
      <StartChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contextBlock={{
          project: undefined,
          source: 'decision',
          summary: 'Decision Start Chat',
          suggestedExploration: 'Stress-test / Re-evaluate this decision',
          fullContext: promptText,
        }}
        runId={runId}
        onStatusUpdate={handleStatusUpdate}
        projectName={undefined}
      />
    </>
  );
}

