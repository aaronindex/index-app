// app/projects/[id]/components/DecisionsTab.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DecisionStartChatButton from './DecisionStartChatButton';
import DeleteDecisionButton from './DeleteDecisionButton';
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
      <SectionHeader action={<CreateDecisionButton projectId={projectId} />}>
        Decisions
      </SectionHeader>

      {decisions.length > 0 && (
        <ActiveFilterPills
          activeCount={activeDecisions.length}
          inactiveCount={inactiveDecisions.length}
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
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-[rgb(var(--text))]">{decision.title}</h3>
                  {decision.is_inactive && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]">
                      Inactive
                    </span>
                  )}
                </div>
                {decision.content && (
                  <p className="text-[rgb(var(--text))] mb-3">
                    {decision.content}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-[rgb(var(--muted))]">
                    {decision.conversation_id && decision.conversation_title ? (
                      <Link
                        href={`/conversations/${decision.conversation_id}`}
                        className="hover:text-[rgb(var(--text))] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        From: {decision.conversation_title}
                      </Link>
                    ) : (
                      <span>Decided: {formatDate(decision.created_at)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <ToggleInactiveButton
                      type="decision"
                      id={decision.id}
                      isInactive={decision.is_inactive || false}
                    />
                    <DecisionStartChatButton decisionId={decision.id} />
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

