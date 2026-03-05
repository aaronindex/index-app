'use client';

import { useEffect } from 'react';

interface ProjectLimitUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function ProjectLimitUpgradeModal({
  isOpen,
  onClose,
  onUpgrade,
}: ProjectLimitUpgradeModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-limit-modal-title"
    >
      <div
        className="bg-[rgb(var(--bg))] rounded-lg p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="project-limit-modal-title"
          className="text-xl font-semibold text-foreground mb-3"
        >
          Free plan includes 1 project.
        </h2>
        <p className="text-sm text-[rgb(var(--text))] mb-2">
          INDEX Pro unlocks unlimited projects — so INDEX can track multiple areas of your thinking over time.
        </p>
        <p className="text-xs text-[rgb(var(--muted))] mb-6">
          You can keep using your existing project for free.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            className="flex-1 px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}
