// app/projects/[id]/components/HighlightsTab.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import DeleteHighlightButton from './DeleteHighlightButton';

type Status = 'priority' | 'open' | 'complete' | 'dormant';

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  
  const statusColors: Record<Status, string> = {
    priority: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dormant: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500',
  };

  const colorClass = statusColors[status as Status] || statusColors.dormant;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface Highlight {
  id: string;
  content: string;
  label: string | null;
  status: string | null;
  conversation_title: string | null;
  conversation_id: string;
  created_at: string;
}

interface HighlightsTabProps {
  highlights: Highlight[];
  projectName?: string;
}

export default function HighlightsTab({ highlights, projectName }: HighlightsTabProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6">
      {highlights.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400">
            No highlights in this project yet. Highlight text in your chats to create highlights.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {highlights.map((highlight) => (
            <Link
              key={highlight.id}
              href={`/conversations/${highlight.conversation_id}`}
              className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {highlight.label && (
                      <h3 className="font-medium text-foreground">{highlight.label}</h3>
                    )}
                    <StatusPill status={highlight.status} />
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 mb-2">
                    {highlight.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>From: {highlight.conversation_title || 'Untitled Chat'}</span>
                      <span>Created: {formatDate(highlight.created_at)}</span>
                    </div>
                    <div onClick={(e) => e.preventDefault()}>
                      <DeleteHighlightButton highlightId={highlight.id} highlightLabel={highlight.label} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

