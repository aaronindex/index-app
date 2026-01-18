// app/projects/[id]/components/ProjectOverflowMenu.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProjectOverflowMenuProps {
  projectId: string;
  projectName: string;
}

export default function ProjectOverflowMenu({ projectId, projectName }: ProjectOverflowMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete project');
        setLoading(false);
        return;
      }

      // Success - redirect to projects list
      router.push('/projects');
      router.refresh();
    } catch (err) {
      setError('Failed to delete project');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 text-sm border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors text-[rgb(var(--text))]"
          aria-label="More options"
        >
          •••
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.12)] rounded-lg shadow-lg z-50">
            <div className="py-1">
              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete project…
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] rounded-lg max-w-md w-full p-6 border border-[rgb(var(--ring)/0.12)]">
            <h2 className="text-xl font-semibold text-[rgb(var(--text))] mb-4">Delete Project</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            <p className="text-[rgb(var(--text))] mb-6">
              Are you sure you want to delete "{projectName}"?
              <br />
              <span className="text-sm text-[rgb(var(--muted))] mt-2 block">
                This will unassign all conversations from this project (conversations will not be deleted). This action cannot be undone.
              </span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium disabled:opacity-50 text-[rgb(var(--text))]"
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

