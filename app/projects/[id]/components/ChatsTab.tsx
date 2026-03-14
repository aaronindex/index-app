// app/projects/[id]/components/ChatsTab.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ActiveFilterPills from './ActiveFilterPills';
import ToggleInactiveButton from './ToggleInactiveButton';
import SectionHeader from '@/app/components/ui/SectionHeader';
import SourceDistillAction from './SourceDistillAction';
import { getTunnelStep, getTunnelDistillCount } from '@/lib/onboarding/state';

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

interface Conversation {
  id: string;
  title: string | null;
  status: string | null;
  updated_at: string;
  highlights_count: number;
  is_inactive?: boolean;
  is_distilled?: boolean;
}

interface ChatsTabProps {
  conversations: Conversation[];
  projectId: string;
}

type Filter = 'active' | 'all' | 'inactive';

const TUNNEL_UPDATE = 'index_tunnel_update';

export default function ChatsTab({ conversations, projectId }: ChatsTabProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('active');
  const [tunnelStep, setTunnelStep] = useState<ReturnType<typeof getTunnelStep>>(null);
  const [tunnelDistillCount, setTunnelDistillCount] = useState(0);

  useEffect(() => {
    const update = () => {
      setTunnelStep(getTunnelStep());
      setTunnelDistillCount(getTunnelDistillCount());
    };
    update();
    window.addEventListener(TUNNEL_UPDATE, update);
    return () => window.removeEventListener(TUNNEL_UPDATE, update);
  }, []);

  const { activeItems, inactiveItems } = useMemo(() => {
    const active = conversations.filter((c) => !c.is_inactive);
    const inactive = conversations.filter((c) => c.is_inactive);
    return { activeItems: active, inactiveItems: inactive };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    if (filter === 'active') return activeItems;
    if (filter === 'inactive') return inactiveItems;
    // 'all' - active first, then inactive (sorted to bottom)
    return [...activeItems, ...inactiveItems];
  }, [filter, activeItems, inactiveItems]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        action={
          <button
            onClick={() => router.push(`/import?project=${projectId}`)}
            className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
          >
            Import sources
          </button>
        }
      >
        Sources
      </SectionHeader>

      <p className="mt-1 text-sm text-[rgb(var(--muted))]">
        Sources are the raw material of this project — full chats or selected segments.
      </p>

      {conversations.length > 0 && (
        <ActiveFilterPills
          activeCount={activeItems.length}
          inactiveCount={inactiveItems.length}
          onFilterChange={setFilter}
        />
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            No sources in this project yet.
          </p>
          <button 
            onClick={() => router.push(`/import?project=${projectId}`)}
            className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
          >
            Import sources into this project
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredConversations.map((conversation, index) => {
            const firstUndistilledIndex = filteredConversations.findIndex((c) => !(c.is_distilled ?? false));
            const highlightDistill = tunnelStep === 3 && tunnelDistillCount === 0 && firstUndistilledIndex >= 0 && index === firstUndistilledIndex;
            return (
              <div
                key={conversation.id}
                className={`rounded-xl bg-[rgb(var(--surface))] shadow-sm ring-1 ring-[rgb(var(--ring)/0.08)] px-4 py-3 transition-all ${
                  conversation.is_inactive
                    ? 'opacity-60'
                    : 'hover:shadow-md hover:ring-[rgb(var(--ring)/0.12)]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/conversations/${conversation.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="font-medium text-sm text-[rgb(var(--text))]">
                        {conversation.title || 'Untitled Chat'}
                      </h3>
                      <StatusPill status={conversation.status} />
                      {conversation.is_inactive && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[rgb(var(--surface2))] text-[rgb(var(--muted))]">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[rgb(var(--muted))]">
                      <span>Updated: {formatDate(conversation.updated_at)}</span>
                    </div>
                  </Link>
                  <div className="shrink-0 pt-0.5">
                    <SourceDistillAction
                      conversationId={conversation.id}
                      projectId={projectId}
                      isDistilled={conversation.is_distilled ?? false}
                      highlightDistill={highlightDistill}
                      onDistilled={() => router.refresh()}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

