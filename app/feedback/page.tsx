// app/feedback/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'question' | 'other';

export default function FeedbackPage() {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('improvement');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-white dark:bg-black">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="border border-green-200 dark:border-green-800 rounded-lg p-8 bg-green-50 dark:bg-green-900/20 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-semibold text-green-800 dark:text-green-400 mb-2">
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
                  setFeedbackType('improvement');
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
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/settings"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors mb-4 inline-block"
          >
            ← Back to Settings
          </Link>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Feedback</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Help us improve INDEX. We read every piece of feedback.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Type of Feedback
            </label>
            <select
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="improvement">Improvement / Suggestion</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="question">Question</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your feedback"
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              rows={8}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
              required
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
              Include details about what you were doing, what you expected, and what happened.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <Link
              href="/settings"
              className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>

        <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong className="text-foreground">Prefer email?</strong> You can also send feedback
            directly to{' '}
            <a
              href="mailto:aaron@indexapp.co?subject=Alpha Feedback"
              className="text-zinc-600 dark:text-zinc-400 hover:text-foreground underline"
            >
              aaron@indexapp.co
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

