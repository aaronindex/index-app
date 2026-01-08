// app/feedback/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FeedbackPage() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter your feedback');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Fire feedback_submitted analytics event
      const { trackEvent } = await import('@/lib/analytics');
      trackEvent('feedback_submitted', {
        message_length: message.trim().length,
      });

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'other', // Default type for simplified form
          subject: 'In-app feedback',
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[rgb(var(--bg))]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-xl p-8 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="font-serif text-2xl font-semibold text-green-800 dark:text-green-400 mb-2">
              Thank You!
            </h1>
            <p className="text-green-700 dark:text-green-300 mb-6">
              Your feedback has been submitted. We read every piece of feedback and appreciate you
              helping make INDEX better.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setSubmitted(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Submit Another
              </button>
              <Link
                href="/projects"
                className="px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors font-medium"
              >
                Back to INDEX
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/settings"
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors mb-4 inline-block"
          >
            ← Back to Settings
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">Feedback</h1>
          <p className="text-[rgb(var(--muted))]">
            Help us improve INDEX. We read every piece of feedback.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's feeling fuzzy or frustrating right now?"
              rows={8}
              className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] resize-none"
              required
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <Link
              href="/settings"
              className="px-6 py-3 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium text-[rgb(var(--text))]"
            >
              Cancel
            </Link>
          </div>
        </form>

        <div className="mt-8 p-4 rounded-lg bg-[rgb(var(--surface2))]">
          <p className="text-sm text-[rgb(var(--muted))]">
            <strong className="text-[rgb(var(--text))]">Prefer email?</strong> You can also send feedback
            directly to{' '}
            <a
              href="mailto:hello@indexapp.co?subject=Alpha Feedback"
              className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] underline"
            >
              hello@indexapp.co
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

