// app/projects/[id]/components/DecisionsTab.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
// Start chat is reserved for project-level re-entry; no per-decision start chat.
import DeleteDecisionButton from './DeleteDecisionButton';
import InvalidateDecisionButton from './InvalidateDecisionButton';
import SupersedeDecisionButton from './SupersedeDecisionButton';
import CreateDecisionButton from './CreateDecisionButton';
import ActiveFilterPills from './ActiveFilterPills';
import ToggleInactiveButton from './ToggleInactiveButton';
import Card from '@/app/components/ui/Card';
import SectionHeader from '@/app/components/ui/SectionHeader';
import SignalBodyPreview from '@/app/components/ui/SignalBodyPreview';

interface Decision {
  id: string;
  title: string;
  content: string | null;
  conversation_title: string | null;
  conversation_id: string | null;
  created_at: string;
  is_inactive?: boolean;
  is_pinned?: boolean;
}

interface DecisionsTabProps {
  decisions: Decision[];
  projectId: string;
}

type ActiveFilter = 'active' | 'all' | 'inactive';

const INITIAL_VISIBLE = 4;

export default function DecisionsTab({ decisions, projectId }: DecisionsTabProps) {
  const [filter, setFilter] = useState<ActiveFilter>('active');
  const [sectionExpanded, setSectionExpanded] = useState(false);

  const { activeDecisions, inactiveDecisions } = useMemo(() => {
    const active = decisions.filter((d) => !d.is_inactive);
    const inactive = decisions.filter((d) => d.is_inactive);
    return { activeDecisions: active, inactiveDecisions: inactive };
  }, [decisions]);

  const filteredDecisions = useMemo(() => {
    if (filter === 'active') return activeDecisions;
    if (filter === 'inactive') return inactiveDecisions;
    return [...activeDecisions, ...inactiveDecisions];
  }, [filter, activeDecisions, inactiveDecisions]);

  const visibleDecisions = sectionExpanded
    ? filteredDecisions
    : filteredDecisions.slice(0, INITIAL_VISIBLE);
  const hasMore = filteredDecisions.length > INITIAL_VISIBLE;

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
      <SectionHeader compact action={<CreateDecisionButton projectId={projectId} />}>
        Decisions
      </SectionHeader>

      {decisions.length > 0 && (
        <ActiveFilterPills
          activeCount={activeDecisions.length}
          inactiveCount={inactiveDecisions.length}
          activeLabel="Unresolved"
          inactiveLabel="Resolved"
          onFilterChange={setFilter}
        />
      )}

      {decisions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[rgb(var(--muted))] mb-4">
            No decisions recorded in this project yet.
          </p>
          <CreateDecisionButton projectId={projectId} />
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDecisions.map((decision) => (
            <Card
              key={decision.id}
              className={`group ${decision.is_inactive ? 'opacity-60' : ''}`}
            >
              <div className="p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.7em] uppercase tracking-wider text-[rgb(var(--muted))] opacity-80 leading-tight mb-0.5">
                      Decision
                    </p>
                    <h3 className="font-semibold text-[rgb(var(--text))] text-sm sm:text-base leading-snug">
                      {decision.title}
                    </h3>
                  </div>
                  {decision.is_inactive && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[rgb(var(--surface2))] text-[rgb(var(--muted))] shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
                {decision.content && (
                  <SignalBodyPreview text={decision.content} className="mb-2" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-4 text-[11px] text-[rgb(var(--muted))] opacity-80 min-w-0">
                    {decision.conversation_id && decision.conversation_title ? (
                      <Link
                        href={`/conversations/${decision.conversation_id}`}
                        className="hover:text-[rgb(var(--text))] transition-colors truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        From: {decision.conversation_title}
                      </Link>
                    ) : (
                      <span>Decided: {formatDate(decision.created_at)}</span>
                    )}
                    {/* TODO: Add AI provenance label for decisions created via Extract Insights
                        Requires schema change to track source (e.g., add source_query or extract_run_id to decisions table) */}
                  </div>
                  <div
                    className="flex items-center gap-2 shrink-0 text-xs text-[rgb(var(--muted))] opacity-60 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <ToggleInactiveButton
                        type="decision"
                        id={decision.id}
                        isInactive={decision.is_inactive || false}
                      />
                      <SupersedeDecisionButton
                        decisionId={decision.id}
                        decisionTitle={decision.title}
                        otherDecisions={decisions
                          .filter((d) => d.id !== decision.id)
                          .map((d) => ({ id: d.id, title: d.title }))}
                      />
                      <InvalidateDecisionButton decisionId={decision.id} />
                    </div>
                    <span className="mx-1 h-4 w-px bg-[rgb(var(--ring)/0.4)]" />
                    <DeleteDecisionButton decisionId={decision.id} decisionTitle={decision.title} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setSectionExpanded((v) => !v)}
              className="text-sm font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              {sectionExpanded ? 'Show less' : `Show all (${filteredDecisions.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

