// app/projects/[id]/components/EditAssetButton.tsx
'use client';

import { useState } from 'react';
import ModalShell from '@/app/components/ui/ModalShell';
import Button from '@/app/components/ui/Button';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface EditAssetButtonProps {
  assetId: string;
  assetTitle: string;
  assetNote: string | null;
}

export default function EditAssetButton({ assetId, assetTitle, assetNote }: EditAssetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(assetTitle);
  const [note, setNote] = useState(assetNote || '');
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    setTitle(assetTitle);
    setNote(assetNote || '');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTitle(assetTitle);
    setNote(assetNote || '');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showError('Title is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update asset');
      }

      showSuccess('Asset updated successfully');
      handleClose();
      window.location.reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
      >
        Edit
      </button>

      {isOpen && (
        <ModalShell onClose={handleClose}>
          <div className="p-6">
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4">
              Edit Asset
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why does this matter? Add context..."
                  rows={4}
                  className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={handleClose} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={loading || !title.trim()}>
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}

