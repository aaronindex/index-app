// app/conversations/[id]/components/CreateBranchModal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Highlight {
  id: string;
  content: string;
  label: string | null;
}

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  highlights: Highlight[];
}

export default function CreateBranchModal({
  isOpen,
  onClose,
  conversationId,
  highlights,
}: CreateBranchModalProps) {
  const router = useRouter();
  const [selectedHighlightId, setSelectedHighlightId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const selectedHighlight = highlights.find((h) => h.id === selectedHighlightId);

  const handleCreate = async () => {
    if (!selectedHighlightId) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/branches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_conversation_id: conversationId,
          origin_highlight_id: selectedHighlightId,
          title: title.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create branch:', errorData.error);
        alert(`Failed to create branch: ${errorData.error}`);
        return;
      }

      const { branch } = await response.json();
      router.push(`/conversations/${branch.id}`);
      router.refresh();
    } catch (err) {
      console.error('Error creating branch:', err);
      alert('Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Create Branch</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Highlight
            </label>
            <select
              value={selectedHighlightId}
              onChange={(e) => {
                setSelectedHighlightId(e.target.value);
                if (e.target.value && !title) {
                  const highlight = highlights.find((h) => h.id === e.target.value);
                  if (highlight) {
                    setTitle(highlight.label || highlight.content.substring(0, 50));
                  }
                }
              }}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-foreground"
            >
              <option value="">Choose a highlight...</option>
              {highlights.map((highlight) => (
                <option key={highlight.id} value={highlight.id}>
                  {highlight.label || highlight.content.substring(0, 60)}
                  {highlight.content.length > 60 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedHighlight && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {selectedHighlight.content}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Branch Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter branch title..."
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-foreground"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedHighlightId || isCreating}
            className="flex-1 px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Branch'}
          </button>
        </div>
      </div>
    </div>
  );
}

