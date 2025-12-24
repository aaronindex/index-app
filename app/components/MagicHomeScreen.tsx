// app/components/MagicHomeScreen.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
        throw new Error('Failed to fetch home data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load home data');
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
              className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 animate-pulse"
            >
              <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3"></div>
            </div>
          ))}
        </div>
        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4 animate-pulse"></div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 animate-pulse"
            >
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto p-6 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchHomeData();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
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
        <Link
          href="/ask"
          className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔍</span>
            <h3 className="text-lg font-semibold text-foreground">Ask Index</h3>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Get AI-synthesized answers from your conversations
          </p>
        </Link>

        <Link
          href="/tools"
          className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🛠️</span>
            <h3 className="text-lg font-semibold text-foreground">Tools</h3>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Generate digests, manage your data, and more
          </p>
        </Link>
      </div>

      {/* Priority Items */}
      {hasPriorityItems && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Priority Items</h2>
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
                <Link
                  key={task.id}
                  href={task.project_id ? `/projects/${task.project_id}?tab=tasks` : '/projects'}
                  className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
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
                          <span className="text-xs text-zinc-500 dark:text-zinc-500">
                            {task.project_name}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                          {task.description.replace(/^\[(Commitment|Blocker|Open Loop)\]\s*/, '')}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            {data.priorityItems.decisions.slice(0, 2).map((decision) => (
              <Link
                key={decision.id}
                href={decision.conversation_id ? `/conversations/${decision.conversation_id}` : '/projects'}
                className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        Decision
                      </span>
                      {decision.conversation_title && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">
                          {decision.conversation_title}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-foreground">{decision.title}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Latest Insights */}
      {hasInsights && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Latest Insights</h2>
            <Link
              href="/projects"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.latestInsights.slice(0, 6).map((insight) => (
              <Link
                key={insight.id}
                href={`/conversations/${insight.conversation_id}`}
                className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {insight.conversation_title || 'Untitled'}
                  </span>
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  {insight.label || insight.content.substring(0, 60) + '...'}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {insight.content}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}


      {/* 3 Things to Revisit */}
      {hasThingsToRevisit && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            3 Things INDEX Thinks You Should Revisit
          </h2>
          <div className="space-y-3">
            {data.thingsToRevisit.map((item) => (
              <Link
                key={item.id}
                href={`/conversations/${item.id}`}
                className="block p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <h3 className="font-medium text-foreground mb-1">
                  {item.title || 'Untitled Conversation'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  Last updated: {formatDate(item.updated_at || item.created_at)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mind Map Preview - Hidden (themes/tags are internal signal layer only) */}

      {/* Digest Preview */}
      {data.latestDigest && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Latest Weekly Digest</h2>
            <Link
              href={`/digests/${data.latestDigest.id}`}
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
            >
              View full →
            </Link>
          </div>
          <Link
            href={`/digests/${data.latestDigest.id}`}
            className="block p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {formatDate(data.latestDigest.week_start)} - {formatDate(data.latestDigest.week_end)}
              </span>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 line-clamp-3">
              {data.latestDigest.summary}
            </p>
            {/* Themes hidden from UI - kept as internal signal layer only */}
          </Link>
        </div>
      )}

      {/* Empty State */}
      {!data.hasConversations && !data.hasProjects && (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Your INDEX is empty. Start by importing your conversations!
          </p>
          <Link
            href="/import"
            className="inline-block px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Import Conversations
          </Link>
        </div>
      )}

      {/* Partial Empty State - Has conversations but no content yet */}
      {data.hasConversations && !hasPriorityItems && !hasInsights && !hasThingsToRevisit && !data.latestDigest && (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400 mb-2">
            You have conversations imported, but no highlights, tasks, or decisions yet.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-4">
            Try creating highlights, extracting insights, or asking questions to get started.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/ask"
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
            >
              Ask Index
            </Link>
            <Link
              href="/projects"
              className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              View Projects
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

