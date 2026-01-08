// app/components/FeedbackModal.tsx
// Modal that appears for eligible users (after they've used INDEX enough)

'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'index_feedback_modal_shown';

export default function FeedbackModal() {
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if modal has already been shown
    const hasShown = localStorage.getItem(STORAGE_KEY) === 'true';
    if (hasShown) {
      setChecking(false);
      return;
    }

    // Check eligibility
    const checkEligibility = async () => {
      try {
        const response = await fetch('/api/feedback/check-eligibility');
        if (!response.ok) {
          setChecking(false);
          return;
        }

        const data = await response.json();
        if (data.eligible) {
          setShow(true);
        }
      } catch (err) {
        console.error('Failed to check feedback eligibility:', err);
      } finally {
        setChecking(false);
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(checkEligibility, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleOpenTypeform = () => {
    window.open('https://form.typeform.com/to/aFmO1cgp', '_blank', 'noopener,noreferrer');
    handleClose();
  };

  if (checking || !show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[rgb(var(--surface))] rounded-xl p-6 max-w-md w-full shadow-xl border border-[rgb(var(--ring)/0.12)]">
        <div className="mb-4">
          <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-2">
            Help shape the future of INDEX
          </h2>
          <p className="text-sm text-[rgb(var(--muted))]">
            You've been using INDEX for a bit. We'd love to hear your thoughts on what's working and what could be better.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleOpenTypeform}
            className="flex-1 px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Share feedback
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium text-[rgb(var(--text))]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

