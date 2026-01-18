// app/components/MagicHomeScreen.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OnboardingFlow from './OnboardingFlow';
import PostImportModal from './PostImportModal';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';
import { showError } from './ErrorNotification';
import GenerateDigestButton from '../tools/components/GenerateDigestButton';

interface HomeData {
  hasConversations: boolean;
  hasProjects: boolean;
  latestDigest: {
    id: string;
    week_start: string;
    week_end: string;
    summary: string;
    top_themes: any;
    open_loops: any;
  } | null;
}

interface StillOpenItem {
  type: 'decision' | 'task';
  id: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  conversationId: string | null;
  conversationTitle: string | null;
  isBlocker?: boolean;
  isOpenLoop?: boolean;
  isAIGenerated?: boolean;
}

export default function MagicHomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [stillOpenItems, setStillOpenItems] = useState<StillOpenItem[]>([]);
  const [stillOpenLoading, setStillOpenLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [postImportModalDismissed, setPostImportModalDismissed] = useState(false);

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

  // Fetch still-open items
  useEffect(() => {
    async function fetchStillOpen() {
      try {
        const response = await fetch('/api/home/still-open');
        if (response.ok) {
          const result = await response.json();
          setStillOpenItems(result.items || []);
        }
      } catch (error) {
        console.error('Error fetching still open items:', error);
      } finally {
        setStillOpenLoading(false);
      }
    }
    fetchStillOpen();
  }, []);

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

  // Check onboarding completion status
  useEffect(() => {
    const completed = localStorage.getItem('index_onboarding_completed');
    setOnboardingCompleted(completed === 'true');
  }, []);

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

  // Show onboarding if not completed (null means still checking, so don't show yet)
  const showOnboarding = onboardingCompleted === false;

  return (
    <div className="space-y-8">
      {/* Onboarding Flow - Show at top on first login */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setOnboardingCompleted(true);
          }}
        />
      )}

      {/* Primary: Across your INDEX - Completely hide when onboarding active */}
      {!showOnboarding && (
        <div>
          <SectionHeader>Across your INDEX</SectionHeader>
          
          {stillOpenLoading ? (
            <div className="text-sm text-[rgb(var(--muted))]">Loading...</div>
          ) : stillOpenItems.length > 0 ? (
            <div className="space-y-3">
              {stillOpenItems.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.projectId ? `/projects/${item.projectId}?tab=${item.type === 'decision' ? 'decisions' : 'tasks'}#${item.id}` : '/projects'}
                  className="block"
                >
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-[rgb(var(--text))] mb-1.5">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
                          <span>{item.type === 'decision' ? 'Decision' : 'Task'}</span>
                          {item.isBlocker && (
                            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-500">
                              Blocker
                            </span>
                          )}
                          {item.isOpenLoop && (
                            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-500">
                              Open Loop
                            </span>
                          )}
                          {item.projectName && (
                            <span>• {item.projectName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
                Nothing needs attention right now.
              </h3>
              <p className="text-sm text-[rgb(var(--muted))]">
                You're clear across active projects. Dive into a project to continue.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Secondary: Weekly Digest - Hide when onboarding active */}
      {!showOnboarding && (
        <div>
          <SectionHeader>Weekly Digest</SectionHeader>
          <Card className="p-6 bg-gradient-to-br from-[rgb(var(--surface2))] to-[rgb(var(--surface))]">
          <p className="text-sm text-[rgb(var(--muted))] mb-4">
            Summarize what shifted this week.
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
      )}

      {/* Post-Import Modal - Has conversations but no content yet */}
      <PostImportModal
        isOpen={data.hasConversations && stillOpenItems.length === 0 && !data.latestDigest && !postImportModalDismissed}
        onClose={() => {
          setPostImportModalDismissed(true);
        }}
      />
    </div>
  );
}

