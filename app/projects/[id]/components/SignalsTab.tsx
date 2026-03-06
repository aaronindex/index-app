// app/projects/[id]/components/SignalsTab.tsx
// Single Signals surface: Decisions, Tasks, Highlights in one place (Read / Signals / Sources nav).

'use client';

import DecisionsTab from './DecisionsTab';
import TasksTab from './TasksTab';
import HighlightsTab from './HighlightsTab';

interface SignalsTabProps {
  decisions: Array<{
    id: string;
    title: string;
    content: string | null;
    conversation_title: string | null;
    conversation_id: string | null;
    created_at: string;
    is_inactive?: boolean;
    is_pinned?: boolean;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'complete' | 'cancelled' | 'dormant' | 'priority';
    horizon: 'this_week' | 'this_month' | 'later' | null;
    is_pinned?: boolean;
    sort_order: number | null;
    conversation_title: string | null;
    conversation_id: string | null;
    created_at: string;
    is_inactive?: boolean;
    source_query?: string | null;
  }>;
  highlights: Array<{
    id: string;
    content: string;
    label: string | null;
    status: string | null;
    conversation_title: string | null;
    conversation_id: string;
    created_at: string;
  }>;
  projectId: string;
  projectName: string;
}

export default function SignalsTab({
  decisions,
  tasks,
  highlights,
  projectId,
  projectName,
}: SignalsTabProps) {
  return (
    <div className="space-y-12">
      <section aria-labelledby="signals-decisions-heading">
        <DecisionsTab decisions={decisions} projectId={projectId} />
      </section>
      <section aria-labelledby="signals-tasks-heading">
        <TasksTab tasks={tasks} projectId={projectId} />
      </section>
      <section aria-labelledby="signals-highlights-heading">
        <HighlightsTab highlights={highlights} projectName={projectName} />
      </section>
    </div>
  );
}
