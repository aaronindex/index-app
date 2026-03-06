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

export default function DecisionsTab({ decisions, projectId }: DecisionsTabProps) {
  const [filter, setFilter] = useState<ActiveFilter>('active');

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
          {filteredDecisions.map((decision) => (
            <Card
              key={decision.id}
              className={decision.is_inactive ? 'opacity-60' : ''}
            >
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
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
                  <p className="text-sm text-[rgb(var(--muted))] mb-2">
                    {decision.content}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-4 text-xs text-[rgb(var(--muted))] opacity-90 min-w-0">
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
                  <div className="flex items-center gap-2 shrink-0 text-xs text-[rgb(var(--muted))] opacity-90" onClick={(e) => e.stopPropagation()}>
                    <ToggleInactiveButton
                      type="decision"
                      id={decision.id}
                      isInactive={decision.is_inactive || false}
                    />
                    <InvalidateDecisionButton decisionId={decision.id} />
                    <SupersedeDecisionButton
                      decisionId={decision.id}
                      decisionTitle={decision.title}
                      otherDecisions={decisions.filter((d) => d.id !== decision.id).map((d) => ({ id: d.id, title: d.title }))}
                    />
                    <DeleteDecisionButton decisionId={decision.id} decisionTitle={decision.title} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

