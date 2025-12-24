// app/digests/components/DigestList.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Digest {
  id: string;
  week_start: string;
  week_end: string;
  summary: string;
  top_themes: any;
  open_loops: any;
  email_sent_at: string | null;
  created_at: string;
}

interface DigestListProps {
  digests: Digest[];
}

export default function DigestList({ digests }: DigestListProps) {
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const handleSendEmail = async (digestId: string) => {
    setSendingEmail(digestId);
    setSentMessage(null);
    try {
      const response = await fetch(`/api/digests/${digestId}/send-email`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      setSentMessage(digestId);
      setSendingEmail(null);
      
      // Refresh page after a short delay to show updated email_sent_at
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Send email error:', error);
      alert(error instanceof Error ? error.message : 'Failed to send email');
      setSendingEmail(null);
    }
  };

  if (digests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          No digests yet. Generate your first weekly digest from the Tools page.
        </p>
        <Link
          href="/tools"
          className="inline-block px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Go to Tools
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {digests.map((digest) => {
        const weekStart = new Date(digest.week_start);
        const weekEnd = new Date(digest.week_end);
        const topThemes = Array.isArray(digest.top_themes) ? digest.top_themes : [];
        const openLoops = Array.isArray(digest.open_loops) ? digest.open_loops : [];

        return (
          <div
            key={digest.id}
            className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  Created: {new Date(digest.created_at).toLocaleDateString()}
                  {digest.email_sent_at && (
                    <span className="ml-2">• Email sent: {new Date(digest.email_sent_at).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                {!digest.email_sent_at && (
                  <>
                    {sentMessage === digest.id ? (
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Email sent!
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendEmail(digest.id)}
                        disabled={sendingEmail === digest.id}
                        className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-foreground transition-colors disabled:opacity-50"
                      >
                        {sendingEmail === digest.id ? 'Sending...' : 'Send Email'}
                      </button>
                    )}
                  </>
                )}
                <Link
                  href={`/digests/${digest.id}`}
                  className="px-3 py-1.5 text-sm bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  View
                </Link>
              </div>
            </div>

            <div className="prose prose-zinc dark:prose-invert max-w-none mb-4">
              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {digest.summary}
              </p>
            </div>

            {/* Themes hidden from UI - kept as internal signal layer only */}

            {openLoops.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Open Loops</h3>
                <ul className="space-y-2">
                  {openLoops.map((loop: any, idx: number) => (
                    <li
                      key={idx}
                      className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="text-sm font-medium text-foreground mb-1">
                        {loop.conversation_title || 'Untitled Conversation'}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        {loop.snippet}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

