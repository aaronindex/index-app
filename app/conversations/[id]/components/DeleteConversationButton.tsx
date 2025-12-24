// app/conversations/[id]/components/DeleteConversationButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteConversationButtonProps {
  conversationId: string;
  conversationTitle: string | null;
  projectId?: string | null;
}

export default function DeleteConversationButton({
  conversationId,
  conversationTitle,
  projectId,
}: DeleteConversationButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete conversation');
        setLoading(false);
        return;
      }

      // Success - redirect
      if (projectId) {
        router.push(`/projects/${projectId}`);
      } else {
        router.push('/unassigned');
      }
      router.refresh();
    } catch (err) {
      setError('Failed to delete conversation');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        Delete Conversation
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Delete Conversation</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            <p className="text-zinc-700 dark:text-zinc-300 mb-6">
              Are you sure you want to delete "{conversationTitle || 'this conversation'}"?
              <br />
              <span className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 block">
                This will permanently delete all messages, highlights, and related data. This action cannot be undone.
              </span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

