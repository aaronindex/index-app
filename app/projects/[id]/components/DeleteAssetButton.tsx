// app/projects/[id]/components/DeleteAssetButton.tsx
'use client';

import { useState } from 'react';
import ModalShell from '@/app/components/ui/ModalShell';
import Button from '@/app/components/ui/Button';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface DeleteAssetButtonProps {
  assetId: string;
  assetTitle: string;
}

export default function DeleteAssetButton({ assetId, assetTitle }: DeleteAssetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete asset');
      }

      showSuccess('Asset deleted successfully');
      setIsOpen(false);
      window.location.reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete asset');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-[rgb(var(--muted))] hover:text-red-600 dark:hover:text-red-400 transition-colors"
      >
        Delete
      </button>

      {isOpen && (
        <ModalShell onClose={() => setIsOpen(false)}>
          <div className="p-6">
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4">
              Delete Asset
            </h2>
            <p className="text-[rgb(var(--text))] mb-6">
              Are you sure you want to delete "{assetTitle}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}

