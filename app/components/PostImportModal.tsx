// app/components/PostImportModal.tsx
// Modal that appears when user has conversations but no content yet

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from './ui/Button';

interface PostImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PostImportModal({ isOpen, onClose }: PostImportModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[rgb(var(--surface))] rounded-2xl max-w-2xl w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-8">
          <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">
            Your conversations are in. Time to focus on what matters.
          </h2>
          <p className="text-[rgb(var(--text))] text-lg mb-6">
            Here's how to move forward:
          </p>
        </div>

        <div className="space-y-4 mb-8 max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgb(var(--text))] text-[rgb(var(--bg))] flex items-center justify-center text-xs font-medium">
              1
            </div>
            <div>
              <p className="font-medium text-[rgb(var(--text))] mb-1">Focus your thinking</p>
              <p className="text-sm text-[rgb(var(--muted))]">
                Group related conversations into a project so INDEX can track what still deserves attention.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgb(var(--text))] text-[rgb(var(--bg))] flex items-center justify-center text-xs font-medium">
              2
            </div>
            <div>
              <p className="font-medium text-[rgb(var(--text))] mb-1">Reduce the noise</p>
              <p className="text-sm text-[rgb(var(--muted))]">
                Open a conversation and extract insights to surface decisions, tasks, and highlights — and let the rest fade.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgb(var(--text))] text-[rgb(var(--bg))] flex items-center justify-center text-xs font-medium">
              3
            </div>
            <div>
              <p className="font-medium text-[rgb(var(--text))] mb-1">Carry something forward</p>
              <p className="text-sm text-[rgb(var(--muted))]">
                Choose what to carry forward. INDEX surfaces what still matters so you can act without re-thinking everything.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link href="/unassigned" onClick={onClose}>
            <Button variant="primary">
              Extract insights from your first conversation
            </Button>
          </Link>
          <button
            onClick={onClose}
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
          >
            Continue exploring
          </button>
        </div>
      </div>
    </div>
  );
}

