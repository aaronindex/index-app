// app/conversations/[id]/components/MobileHighlightsPanel.tsx
'use client';

import { useState } from 'react';
import CreateTaskFromHighlightButton from './CreateTaskFromHighlightButton';
import DeleteHighlightButton from '@/app/projects/[id]/components/DeleteHighlightButton';

interface Highlight {
  id: string;
  message_id: string;
  content: string;
  start_offset: number | null;
  end_offset: number | null;
  label: string | null;
}

interface MobileHighlightsPanelProps {
  highlights: Highlight[];
  conversationId: string;
  projectId: string | null;
}

export default function MobileHighlightsPanel({
  highlights,
  conversationId,
  projectId,
}: MobileHighlightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no highlights
  if (!highlights || highlights.length === 0) {
    return null;
  }

  return (
    <div className="lg:hidden mb-4 w-full">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <span className="text-sm font-medium text-foreground">Highlights</span>
        <span className="text-xs text-[rgb(var(--muted))]">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-white dark:bg-zinc-950">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded text-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    {highlight.label && (
                      <p className="font-medium text-foreground mb-1">{highlight.label}</p>
                    )}
                    <p className="text-zinc-700 dark:text-zinc-300 text-xs">
                      {highlight.content}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {projectId && (
                    <CreateTaskFromHighlightButton
                      highlightId={highlight.id}
                      highlightContent={highlight.content}
                      conversationId={conversationId}
                      projectId={projectId}
                    />
                  )}
                  <DeleteHighlightButton highlightId={highlight.id} highlightLabel={highlight.label} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

