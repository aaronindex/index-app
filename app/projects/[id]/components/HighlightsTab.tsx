// app/projects/[id]/components/HighlightsTab.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import DeleteHighlightButton from './DeleteHighlightButton';
import Card from '@/app/components/ui/Card';
import SectionHeader from '@/app/components/ui/SectionHeader';
import SignalContextToggle from '@/app/components/ui/SignalContextToggle';

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

const INITIAL_VISIBLE = 4;

export default function HighlightsTab({ highlights, projectName }: HighlightsTabProps) {
  const [sectionExpanded, setSectionExpanded] = useState(false);
  const visibleHighlights = sectionExpanded ? highlights : highlights.slice(0, INITIAL_VISIBLE);
  const hasMoreHighlights = highlights.length > INITIAL_VISIBLE;

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
      <SectionHeader compact>Insights</SectionHeader>

      {highlights.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[rgb(var(--muted))]">
            No highlights in this project yet. Highlight text in your chats to create highlights.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleHighlights.map((highlight) => (
            <Card key={highlight.id} hover className="group">
              <Link
                href={`/conversations/${highlight.conversation_id}`}
                className="block p-3"
              >
                <div className="flex items-start justify-between mb-0.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.7em] uppercase tracking-wider text-[rgb(var(--muted))] opacity-80 leading-tight mb-0.5">
                      Insight
                    </p>
                    {highlight.label ? (
                      <h3 className="font-semibold text-[rgb(var(--text))] text-sm sm:text-base leading-snug">
                        {highlight.label}
                      </h3>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusPill status={highlight.status} />
                  </div>
                </div>
                <SignalContextToggle context={highlight.content} />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-4 text-[11px] text-[rgb(var(--muted))] opacity-80 min-w-0">
                    <span className="truncate">From: {highlight.conversation_title || 'Untitled Chat'}</span>
                    <span>Created: {formatDate(highlight.created_at)}</span>
                    {/* TODO: Add AI provenance label for highlights created via Extract Insights
                        Requires schema change to track source (e.g., add source_query or extract_run_id to highlights table) */}
                  </div>
                  <div
                    className="shrink-0 text-xs text-[rgb(var(--muted))] opacity-60 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <DeleteHighlightButton highlightId={highlight.id} highlightLabel={highlight.label} />
                  </div>
                </div>
              </Link>
            </Card>
          ))}
          {hasMoreHighlights && (
            <button
              type="button"
              onClick={() => setSectionExpanded((v) => !v)}
              className="text-sm font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              {sectionExpanded ? 'Show less' : `Show all (${highlights.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

