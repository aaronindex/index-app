// app/components/MagicHomeScreen.tsx
'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const response = await fetch('/api/home/data');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch home data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load home data';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Quick Commands Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.08)] animate-pulse"
            >
              <div className="h-6 bg-[rgb(var(--surface2))] rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-[rgb(var(--surface2))] rounded w-2/3"></div>
            </div>
          ))}
        </div>
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

  const hasPriorityItems = data.priorityItems.tasks.length > 0 || data.priorityItems.decisions.length > 0;
  const hasInsights = data.latestInsights.length > 0;
  const hasThingsToRevisit = data.thingsToRevisit.length > 0;

  return (
    <div className="space-y-8">
      {/* Quick Commands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card hover className="p-6 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
          <Link href="/ask" className="block">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🔍</span>
              <h3 className="text-lg font-semibold text-[rgb(var(--text))]">Ask Index</h3>
            </div>
            <p className="text-sm text-[rgb(var(--muted))]">
              Get AI-synthesized answers from your conversations
            </p>
          </Link>
        </Card>

      </div>

      {/* Priority Items */}
      {hasPriorityItems && (
        <div>
          <SectionHeader>Priority Items</SectionHeader>
          <div className="space-y-3">
            {data.priorityItems.tasks.slice(0, 5).map((task) => {
              // Determine badge color based on task type (from description)
              const isAIExtracted = task.source_query === 'AI Insight Extraction';
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

              return (
                <Card key={task.id} hover>
                  <Link
                    href={task.project_id ? `/projects/${task.project_id}?tab=tasks` : '/projects'}
                    className="block p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                          {isAIExtracted && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                              AI
                            </span>
                          )}
                          {task.project_name && (
                            <span className="text-xs text-[rgb(var(--muted))]">
                              {task.project_name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-[rgb(var(--text))]">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-[rgb(var(--muted))] mt-1 line-clamp-2">
                            {task.description.replace(/^\[(Commitment|Blocker|Open Loop)\]\s*/, '')}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </Card>
              );
            })}
            {data.priorityItems.decisions.slice(0, 2).map((decision) => (
              <Card key={decision.id} hover>
                <Link
                  href={decision.conversation_id ? `/conversations/${decision.conversation_id}` : '/projects'}
                  className="block p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                          Decision
                        </span>
                        {decision.conversation_title && (
                          <span className="text-xs text-[rgb(var(--muted))]">
                            {decision.conversation_title}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-[rgb(var(--text))]">{decision.title}</h3>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Latest Insights */}
      {hasInsights && (
        <div>
          <SectionHeader action={
            <Link
              href="/projects"
              className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              View all →
            </Link>
          }>
            Latest Insights
          </SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.latestInsights.slice(0, 6).map((insight) => (
              <Card key={insight.id} hover>
                <Link
                  href={`/conversations/${insight.conversation_id}`}
                  className="block p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[rgb(var(--muted))]">
                      {insight.conversation_title || 'Untitled'}
                    </span>
                  </div>
                  <h3 className="font-medium text-[rgb(var(--text))] mb-1">
                    {insight.label || insight.content.substring(0, 60) + '...'}
                  </h3>
                  <p className="text-sm text-[rgb(var(--muted))] line-clamp-2">
                    {insight.content}
                  </p>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}


      {/* 3 Things to Revisit */}
      {hasThingsToRevisit && (
        <div>
          <SectionHeader>3 Things INDEX Thinks You Should Revisit</SectionHeader>
          <div className="space-y-3">
            {data.thingsToRevisit.map((item) => (
              <Card key={item.id} hover>
                <Link
                  href={`/conversations/${item.id}`}
                  className="block p-4"
                >
                  <h3 className="font-medium text-[rgb(var(--text))] mb-1">
                    {item.title || 'Untitled Conversation'}
                  </h3>
                  <p className="text-xs text-[rgb(var(--muted))]">
                    Last updated: {formatDate(item.updated_at || item.created_at)}
                  </p>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mind Map Preview - Hidden (themes/tags are internal signal layer only) */}

      {/* Digest Preview */}
      {data.latestDigest && (
        <div>
          <SectionHeader 
            description="Your weekly intelligence briefing: what changed, open loops, and next steps"
            action={
              <Link
                href={`/digests/${data.latestDigest.id}`}
                className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
              >
                View full →
              </Link>
            }
          >
            Latest Weekly Digest
          </SectionHeader>
          <Card hover className="p-6 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
            <Link href={`/digests/${data.latestDigest.id}`} className="block">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-[rgb(var(--muted))]">
                  {formatDate(data.latestDigest.week_start)} - {formatDate(data.latestDigest.week_end)}
                </span>
              </div>
              <p className="text-[rgb(var(--text))] line-clamp-3">
                {data.latestDigest.summary}
              </p>
            </Link>
          </Card>
        </div>
      )}

      {/* Weekly Digest Section */}
      <div>
        <SectionHeader>Weekly Digest</SectionHeader>
        <Card className="p-6 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
          <p className="text-sm text-[rgb(var(--muted))] mb-4">
            Collapse your week into what still matters.
          </p>
          <GenerateDigestButton />
        </Card>
      </div>

      {/* Empty State - Onboarding Flow */}
      {!data.hasConversations && !data.hasProjects && (
        <div className="py-12">
          <OnboardingFlow />
        </div>
      )}

      {/* Partial Empty State - Has conversations but no content yet */}
      {data.hasConversations && !hasPriorityItems && !hasInsights && !hasThingsToRevisit && !data.latestDigest && (
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

