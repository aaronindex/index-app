// app/conversations/[id]/components/ReduceOnboardingModal.tsx
// One-time modal that explains what "Reduce" does on first conversation view

'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'index_reduce_onboarding_dismissed';

export default function ReduceOnboardingModal() {
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if modal has already been dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (dismissed) {
      setChecking(false);
      return;
    }

    // Small delay to ensure page is loaded
    const timer = setTimeout(() => {
      setShow(true);
      setChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  // Handle Escape key
  useEffect(() => {
    if (!show) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShow(false);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show]);

  if (checking || !show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleDismiss}
    >
      <div
        className="bg-[rgb(var(--surface))] rounded-2xl p-6 max-w-md w-full shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))]">
            Reduce
          </h2>
          <button
            onClick={handleDismiss}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-[rgb(var(--text))] mb-3">
            Reduce this conversation to what still matters.
          </p>
          <p className="text-sm text-[rgb(var(--muted))]">
            Click Reduce to carry forward decisions, tasks, and highlights — and let the rest go.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Got it
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium text-[rgb(var(--text))]"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

