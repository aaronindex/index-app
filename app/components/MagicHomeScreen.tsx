// app/components/MagicHomeScreen.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OnboardingFlow from './OnboardingFlow';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';
import { showError } from './ErrorNotification';
import GenerateDigestButton from '../tools/components/GenerateDigestButton';

interface HomeData {
  hasConversations: boolean;
  hasProjects: boolean;
  priorityItems: {
    tasks: Array<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      project_id: string | null;
      project_name: string | null;
      conversation_id: string | null;
      source_query: string | null;
      created_at: string;
    }>;
    decisions: Array<{
      id: string;
      title: string;
      content: string | null;
      conversation_id: string | null;
      conversation_title: string | null;
      project_id: string | null;
      project_name: string | null;
      created_at: string;
    }>;
  };
  latestInsights: Array<{
    id: string;
    content: string;
    label: string | null;
    conversation_id: string;
    conversation_title: string | null;
    created_at: string;
  }>;
  thingsToRevisit: Array<{
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string | null;
    project_id: string | null;
    project_name: string | null;
  }>;
  latestDigest: {
    id: string;
    week_start: string;
    week_end: string;
    summary: string;
    top_themes: any;
    open_loops: any;
  } | null;
}

export default function MagicHomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // All hooks must be called unconditionally at the top level (before any early returns)
  const formatDate = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  }, []);

  // Trigger welcome email on first signed-in experience (idempotent, quiet)
  useEffect(() => {
    // Fire-and-forget: call welcome email endpoint once
    // Safe to call multiple times (idempotent)
    fetch('/api/lifecycle/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {
      // Silently fail - don't spam logs or show errors to user
    });
  }, []);

  // Group priority items and revisit items by project - MUST be before early returns
  const groupedByProject = useMemo(() => {
    if (!data) return {};
    
    const groups: Record<string, {
      project_id: string | null;
      project_name: string | null;
      items: Array<{
        type: 'task' | 'decision' | 'revisit';
        id: string;
        title: string;
        secondary: string;
        href: string;
        badgeLabel: string;
        badgeColor: string;
      }>;
    }> = {};

    // Add priority tasks
    (data.priorityItems?.tasks || []).slice(0, 5).forEach((task) => {
      const projectKey = task.project_id || 'unassigned';
      if (!groups[projectKey]) {
        groups[projectKey] = {
          project_id: task.project_id,
          project_name: task.project_name,
          items: [],
        };
      }

      const isCommitment = task.description?.includes('[Commitment]');
      const isBlocker = task.description?.includes('[Blocker]');
      const isOpenLoop = task.description?.includes('[Open Loop]');
      
      let badgeColor = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      let badgeLabel = 'Task';
      if (isCommitment) {
        badgeColor = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
        badgeLabel = 'Commitment';
      } else if (isBlocker) {
        badgeColor = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
        badgeLabel = 'Blocker';
      } else if (isOpenLoop) {
        badgeColor = 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400';
        badgeLabel = 'Open Loop';
      }

      groups[projectKey].items.push({
        type: 'task',
        id: task.id,
        title: task.title,
        secondary: task.project_name || formatDate(task.created_at),
        href: task.project_id ? `/projects/${task.project_id}?tab=tasks` : '/projects',
        badgeLabel,
        badgeColor,
      });
    });

    // Add priority decisions
    (data.priorityItems?.decisions || []).slice(0, 2).forEach((decision) => {
      const projectKey = decision.project_id || 'unassigned';
      if (!groups[projectKey]) {
        groups[projectKey] = {
          project_id: decision.project_id,
          project_name: decision.project_name,
          items: [],
        };
      }

      groups[projectKey].items.push({
        type: 'decision',
        id: decision.id,
        title: decision.title,
        secondary: decision.conversation_title || decision.project_name || formatDate(decision.created_at),
        href: decision.project_id ? `/projects/${decision.project_id}?tab=decisions` : (decision.conversation_id ? `/conversations/${decision.conversation_id}` : '/projects'),
        badgeLabel: 'Decision',
        badgeColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
      });
    });

    // Add revisit items
    (data.thingsToRevisit || []).forEach((revisit) => {
      const projectKey = revisit.project_id || 'unassigned';
      if (!groups[projectKey]) {
        groups[projectKey] = {
          project_id: revisit.project_id,
          project_name: revisit.project_name,
          items: [],
        };
      }

      groups[projectKey].items.push({
        type: 'revisit',
        id: revisit.id,
        title: revisit.title || 'Untitled Conversation',
        secondary: `Last updated: ${formatDate(revisit.updated_at || revisit.created_at)}`,
        href: `/conversations/${revisit.id}`,
        badgeLabel: 'Revisit',
        badgeColor: 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-800 dark:text-zinc-400',
      });
    });

    // Limit items per project: 1-3 priority items + 0-1 revisit
    Object.keys(groups).forEach((key) => {
      const group = groups[key];
      const priorityItems = group.items.filter((i) => i.type !== 'revisit');
      const revisitItems = group.items.filter((i) => i.type === 'revisit');
      
      group.items = [
        ...priorityItems.slice(0, 3),
        ...revisitItems.slice(0, 1),
      ];
    });

    return groups;
  }, [data, formatDate]);

  const hasUnifiedItems = Object.keys(groupedByProject).length > 0 && 
    Object.values(groupedByProject).some((g) => g.items.length > 0);

  const fetchHomeData = useCallback(async () => {
    try {
      const response = await fetch('/api/home/data');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to fetch home data (${response.status})`;
        console.error('[Home] API error:', errorMessage, errorData);
        throw new Error(errorMessage);
      }
      const result = await response.json();
      console.log('[Home] Data received:', { 
        hasPriorityItems: result.priorityItems?.tasks?.length || result.priorityItems?.decisions?.length,
        hasRevisit: result.thingsToRevisit?.length,
        hasDigest: !!result.latestDigest
      });
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load home data';
      console.error('[Home] Error:', err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="space-y-8">
        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-7 bg-[rgb(var(--surface2))] rounded w-1/4 animate-pulse"></div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.08)] animate-pulse"
            >
              <div className="h-5 bg-[rgb(var(--surface2))] rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-[rgb(var(--surface2))] rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto p-6 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800">
          <p className="text-red-800 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchHomeData();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Primary: Unified Priority List */}
      {hasUnifiedItems ? (
        <div>
          <SectionHeader>What still deserves attention</SectionHeader>
          <div className="space-y-6">
            {Object.entries(groupedByProject)
              .filter(([_, group]) => group.items.length > 0)
              .map(([key, group]) => (
                <div key={key}>
                  {group.project_name && (
                    <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">
                      {group.project_name}
                    </h3>
                  )}
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <Card key={item.id} hover>
                        <Link href={item.href} className="block p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${item.badgeColor}`}>
                              {item.badgeLabel}
                            </span>
                          </div>
                          <h3 className="font-medium text-[rgb(var(--text))] mb-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-[rgb(var(--muted))]">
                            {item.secondary}
                          </p>
                        </Link>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div>
          <SectionHeader>What still deserves attention</SectionHeader>
          <Card className="p-8 text-center">
            <p className="text-[rgb(var(--muted))]">
              No priority items yet. Import a conversation, create a highlight, or ask INDEX a question.
            </p>
          </Card>
        </div>
      )}

      {/* Secondary: Weekly Digest */}
      <div>
        <SectionHeader>Weekly Digest</SectionHeader>
        <Card className="p-6 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
          <p className="text-sm text-[rgb(var(--muted))] mb-4">
            Collapse your week into what still matters.
          </p>
          {data.latestDigest ? (
            <>
              <div className="mb-4 pb-4 border-b border-[rgb(var(--ring)/0.08)]">
                <Link href={`/digests/${data.latestDigest.id}`} className="block">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[rgb(var(--muted))]">
                      {formatDate(data.latestDigest.week_start)} - {formatDate(data.latestDigest.week_end)}
                    </span>
                    <span className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors">
                      View full →
                    </span>
                  </div>
                  <p className="text-[rgb(var(--text))] line-clamp-2 text-sm">
                    {data.latestDigest.summary}
                  </p>
                </Link>
              </div>
              <GenerateDigestButton />
            </>
          ) : (
            <GenerateDigestButton />
          )}
        </Card>
      </div>

      {/* Empty State - Onboarding Flow */}
      {!data.hasConversations && !data.hasProjects && (
        <div className="py-12">
          <OnboardingFlow />
        </div>
      )}

      {/* Partial Empty State - Has conversations but no content yet */}
      {data.hasConversations && !hasUnifiedItems && !data.latestDigest && (
        <div className="max-w-2xl mx-auto text-center py-12">
          <Card className="p-8 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
            <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
              Your INDEX is ready!
            </h3>
            <p className="text-[rgb(var(--text))] mb-6">
              You have conversations imported. Here's how to get the most out of INDEX:
            </p>
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgb(var(--text))] text-[rgb(var(--bg))] flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium text-[rgb(var(--text))] mb-1">Organize with Projects</p>
                  <p className="text-sm text-[rgb(var(--muted))]">
                    Group related conversations into projects to keep your INDEX organized.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgb(var(--text))] text-[rgb(var(--bg))] flex items-center justify-center text-xs font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium text-[rgb(var(--text))] mb-1">Extract Insights</p>
                  <p className="text-sm text-[rgb(var(--muted))]">
                    Visit a conversation and click "Extract Insights" to automatically find decisions, tasks, and highlights.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[rgb(var(--text))] text-[rgb(var(--bg))] flex items-center justify-center text-xs font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium text-[rgb(var(--text))] mb-1">Ask Your INDEX</p>
                  <p className="text-sm text-[rgb(var(--muted))]">
                    Use Ask Index to search across all your conversations and get AI-powered answers.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center mt-8">
              <Link
                href="/ask"
                className="px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium text-[rgb(var(--text))]"
              >
                Ask Index
              </Link>
              <Link
                href="/projects"
                className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                View Projects
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

