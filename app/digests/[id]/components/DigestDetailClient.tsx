// app/digests/[id]/components/DigestDetailClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Digest {
  id: string;
  week_start: string;
  week_end: string;
  summary: string;
  what_changed: any;
  top_themes: any;
  open_loops: any;
  recommended_next_steps: any;
  email_sent_at: string | null;
  created_at: string;
}

interface DigestDetailClientProps {
  digest: Digest;
}

export default function DigestDetailClient({ digest }: DigestDetailClientProps) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const whatChanged = digest.what_changed || null;
  const topThemes = Array.isArray(digest.top_themes) ? digest.top_themes : [];
  const openLoops = Array.isArray(digest.open_loops) ? digest.open_loops : [];
  const recommendedNextSteps = Array.isArray(digest.recommended_next_steps) ? digest.recommended_next_steps : [];

  const getPriorityColor = (priority?: string) => {
    if (priority === 'high') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
    if (priority === 'medium') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
    return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500';
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    setEmailSent(false);
    try {
      const response = await fetch(`/api/digests/${digest.id}/send-email`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      setEmailSent(true);
      setSendingEmail(false);
      
      // Refresh page after a short delay to show updated email_sent_at
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Send email error:', error);
      alert(error instanceof Error ? error.message : 'Failed to send email');
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
        <h2 className="text-xl font-semibold text-foreground mb-4">Summary</h2>
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {digest.summary}
          </p>
        </div>
      </div>

      {/* What Changed */}
      {whatChanged && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
          <h2 className="text-xl font-semibold text-foreground mb-4">What Changed This Week</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {whatChanged.conversations > 0 && (
              <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{whatChanged.conversations}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Conversation{whatChanged.conversations !== 1 ? 's' : ''}
                </div>
              </div>
            )}
            {whatChanged.highlights > 0 && (
              <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{whatChanged.highlights}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Highlight{whatChanged.highlights !== 1 ? 's' : ''}
                </div>
              </div>
            )}
            {whatChanged.tasks > 0 && (
              <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{whatChanged.tasks}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Task{whatChanged.tasks !== 1 ? 's' : ''}
                </div>
              </div>
            )}
            {whatChanged.decisions > 0 && (
              <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{whatChanged.decisions}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Decision{whatChanged.decisions !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
          {whatChanged.narrative && (
            <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {whatChanged.narrative}
            </p>
          )}
        </div>
      )}

      {/* Themes hidden from UI - kept as internal signal layer only */}

      {/* Open Loops */}
      {openLoops.length > 0 && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
          <h2 className="text-xl font-semibold text-foreground mb-4">Open Loops</h2>
          <div className="space-y-3">
            {openLoops.map((loop: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">
                      {loop.conversation_title || 'Untitled Conversation'}
                    </h3>
                    {loop.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(loop.priority)}`}>
                        {loop.priority}
                      </span>
                    )}
                  </div>
                  {loop.conversation_id && (
                    <Link
                      href={`/conversations/${loop.conversation_id}`}
                      className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
                    >
                      View →
                    </Link>
                  )}
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {loop.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Next Steps */}
      {recommendedNextSteps.length > 0 && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recommended Next Steps</h2>
          <div className="space-y-3">
            {recommendedNextSteps.map((step: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{step.action}</h3>
                    {step.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(step.priority)}`}>
                        {step.priority}
                      </span>
                    )}
                  </div>
                </div>
                {step.reason && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {step.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 items-center">
        {!digest.email_sent_at && (
          <>
            {emailSent ? (
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ✓ Email sent successfully!
                </span>
              </div>
            ) : (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            )}
          </>
        )}
        <Link
          href="/digests"
          className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
        >
          Back to Digests
        </Link>
      </div>
    </div>
  );
}

