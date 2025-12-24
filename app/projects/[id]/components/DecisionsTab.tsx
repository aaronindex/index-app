// app/projects/[id]/components/DecisionsTab.tsx
'use client';

import Link from 'next/link';
import DecisionStartChatButton from './DecisionStartChatButton';
import DeleteDecisionButton from './DeleteDecisionButton';
import CreateDecisionButton from './CreateDecisionButton';

interface Decision {
  id: string;
  title: string;
  content: string | null;
  conversation_title: string | null;
  conversation_id: string | null;
  created_at: string;
}

interface DecisionsTabProps {
  decisions: Decision[];
  projectId: string;
}

export default function DecisionsTab({ decisions, projectId }: DecisionsTabProps) {
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Decisions</h2>
        <CreateDecisionButton projectId={projectId} />
      </div>

      {decisions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            No decisions recorded in this project yet.
          </p>
          <CreateDecisionButton projectId={projectId} />
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950"
            >
              <h3 className="font-medium text-foreground mb-2">{decision.title}</h3>
              {decision.content && (
                <p className="text-zinc-700 dark:text-zinc-300 mb-3">
                  {decision.content}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {decision.conversation_id && decision.conversation_title ? (
                    <Link
                      href={`/conversations/${decision.conversation_id}`}
                      className="hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      From: {decision.conversation_title}
                    </Link>
                  ) : (
                    <span>Decided: {formatDate(decision.created_at)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <DecisionStartChatButton decisionId={decision.id} />
                  <DeleteDecisionButton decisionId={decision.id} decisionTitle={decision.title} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

