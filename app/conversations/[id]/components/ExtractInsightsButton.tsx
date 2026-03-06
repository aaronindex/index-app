// app/conversations/[id]/components/ExtractInsightsButton.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics/track';
import { getOnboardingStep, setOnboardingStep } from '@/lib/onboarding/state';
import FirstStructuralMomentModal from './FirstStructuralMomentModal';

interface ExtractInsightsButtonProps {
  conversationId: string;
  projectId: string | null;
}

export default function ExtractInsightsButton({ conversationId, projectId }: ExtractInsightsButtonProps) {
  const router = useRouter();
  const extractInFlightRef = useRef(false);
  const extractTimeoutRef = useRef(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    insights: {
      decisions: number;
      commitments: number;
      blockers: number;
      openLoops: number;
      suggestedHighlights: number;
    };
    created: number;
    firstReduce?: boolean;
    counts?: { decisions: number; openLoops: number; suggestedHighlights: number };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFirstStructuralModal, setShowFirstStructuralModal] = useState(false);
  const [firstStructuralCounts, setFirstStructuralCounts] = useState<{
    decisions: number;
    openLoops: number;
    suggestedHighlights: number;
  } | null>(null);

  useEffect(() => {
    if (!showSuccessModal && !showFirstStructuralModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuccessModal(false);
        setShowFirstStructuralModal(false);
        router.refresh();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showSuccessModal, showFirstStructuralModal, router]);

  const handleExtract = async () => {
    if (extractInFlightRef.current) return;
    extractInFlightRef.current = true;
    setExtracting(true);
    setError(null);
    setResult(null);

    const abortController = new AbortController();
    const timeoutMs = 180_000; // 3 minutes
    extractTimeoutRef.current = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      extractTimeoutRef.current = true;
      abortController.abort();
    }, timeoutMs);

    try {
      const response = await fetch('/api/insights/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
        signal: abortController.signal,
      });
      if (timeoutId != null) clearTimeout(timeoutId);

      const text = await response.text();
      let data: Record<string, unknown>;
      try {
        data = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        setError('Invalid response from server. Please try again.');
        return;
      }

      if (!response.ok) {
        const errMsg = typeof data.error === 'string' ? data.error : 'Failed to extract insights';
        setError(errMsg);
        return;
      }

      setResult(data as typeof result);

      if (data.success && data.insights && typeof data.insights === 'object') {
        const insights = data.insights as Record<string, number>;
        const eventParams = {
          conversation_id: conversationId,
          project_id: projectId || null,
          total_insights: typeof data.created === 'number' ? data.created : 0,
          decisions_count: insights.decisions ?? 0,
          commitments_count: insights.commitments ?? 0,
          blockers_count: insights.blockers ?? 0,
          open_loops_count: insights.openLoops ?? 0,
          highlights_count: insights.suggestedHighlights ?? 0,
        };
        track('insights_extracted', eventParams);
        console.log('[Analytics] insights_extracted', eventParams);

        if (data.firstReduce && data.counts && typeof data.counts === 'object') {
          const c = data.counts as { decisions: number; openLoops: number; suggestedHighlights: number };
          setFirstStructuralCounts({
            decisions: c.decisions ?? 0,
            openLoops: c.openLoops ?? 0,
            suggestedHighlights: c.suggestedHighlights ?? 0,
          });
          if (getOnboardingStep() === 3) setOnboardingStep(4);
          setShowFirstStructuralModal(true);
        } else {
          setShowSuccessModal(true);
        }
      }
    } catch (err) {
      if (timeoutId != null) clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isTimeout = isAbort && extractTimeoutRef.current;
      setError(
        isTimeout
          ? 'Distillation is taking too long. Try again in a moment.'
          : isAbort
            ? 'Request was canceled. Click Distill signals again.'
            : err instanceof Error
              ? err.message
              : 'Failed to extract insights'
      );
    } finally {
      extractInFlightRef.current = false;
      setExtracting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="relative group">
        <button
          disabled
          className="px-6 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-lg cursor-not-allowed font-medium min-w-[120px]"
          aria-label="Distill signals from this conversation"
        >
          Distill signals
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Assign this conversation to a project to enable Distill signals.
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative group">
        <button
          onClick={handleExtract}
          disabled={extracting}
          className="px-6 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium min-w-[120px]"
          aria-label="Distill signals from this conversation"
          data-onboarding="distill-signals"
        >
          {extracting ? 'Distilling...' : 'Distill signals'}
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Extract decisions, tasks, loops, and highlights
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100"></div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* First structural moment: shown once per account after first distillation */}
      {showFirstStructuralModal && (
        <FirstStructuralMomentModal
          counts={firstStructuralCounts}
          onContinue={async () => {
            try {
              await fetch('/api/profile/first-reduce-acknowledged', { method: 'POST', credentials: 'same-origin' });
            } catch {
              // continue to close
            }
            setShowFirstStructuralModal(false);
            setFirstStructuralCounts(null);
            router.refresh();
          }}
          onboardingStep4={
            projectId && getOnboardingStep() === 4
              ? {
                  projectId,
                  onViewSignals: () => {
                    setOnboardingStep(5);
                    setShowFirstStructuralModal(false);
                    setFirstStructuralCounts(null);
                    fetch('/api/profile/first-reduce-acknowledged', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
                    router.push(`/projects/${projectId}?tab=signals`);
                  },
                  onImportAnother: () => {
                    setOnboardingStep(2);
                    setShowFirstStructuralModal(false);
                    setFirstStructuralCounts(null);
                    fetch('/api/profile/first-reduce-acknowledged', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
                    router.push('/import');
                  },
                }
              : undefined
          }
        />
      )}

      {/* Success Modal (subsequent distillations) */}
      {showSuccessModal && result && result.success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowSuccessModal(false);
            router.refresh();
          }}
        >
          <div
            className="bg-[rgb(var(--surface))] rounded-2xl max-w-lg w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">✨</div>
              <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-2">
                Signals distilled
              </h2>
              <p className="text-sm text-[rgb(var(--muted))]">
                {result.created} item{result.created !== 1 ? 's' : ''} carried forward
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-[rgb(var(--text))] mb-3">
                What remains
              </h3>
              <div className="space-y-2">
                {result.insights.decisions > 0 && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-sm font-medium text-[rgb(var(--text))]">Decisions</span>
                    <span className="text-sm text-[rgb(var(--muted))]">{result.insights.decisions}</span>
                  </div>
                )}
                {result.insights.commitments > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-sm font-medium text-[rgb(var(--text))]">Commitments</span>
                    <span className="text-sm text-[rgb(var(--muted))]">{result.insights.commitments}</span>
                  </div>
                )}
                {result.insights.blockers > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-sm font-medium text-[rgb(var(--text))]">Blockers</span>
                    <span className="text-sm text-[rgb(var(--muted))]">{result.insights.blockers}</span>
                  </div>
                )}
                {result.insights.openLoops > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <span className="text-sm font-medium text-[rgb(var(--text))]">Open Loops</span>
                    <span className="text-sm text-[rgb(var(--muted))]">{result.insights.openLoops}</span>
                  </div>
                )}
                {result.insights.suggestedHighlights > 0 && (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm font-medium text-[rgb(var(--text))]">Highlights</span>
                    <span className="text-sm text-[rgb(var(--muted))]">{result.insights.suggestedHighlights}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.refresh();
                }}
                className="px-6 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

