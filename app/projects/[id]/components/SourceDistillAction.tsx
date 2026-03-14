'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics/track';
import {
  getTunnelStep,
  getTunnelDistillCount,
  setTunnelDistillCount,
  setTunnelStep,
} from '@/lib/onboarding/state';
import FirstStructuralMomentModal from '@/app/conversations/[id]/components/FirstStructuralMomentModal';
import { dispatchTunnelUpdate } from './OnboardingProjectOverlay';

type ExtractedDetail =
  | { type: 'decision'; id: string; title?: string | null; content?: string | null }
  | { type: 'commitment'; id: string; title?: string | null; content?: string | null }
  | { type: 'blocker'; id: string; title?: string | null; content?: string | null }
  | { type: 'open_loop'; id: string; title?: string | null; content?: string | null }
  | { type: 'highlight'; id: string; title?: string | null; content?: string | null };

type ExtractionResult = {
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
  details?: ExtractedDetail[];
};

interface SourceDistillActionProps {
  conversationId: string;
  projectId: string;
  isDistilled: boolean;
  onDistilled?: () => void;
  /** When true, visually highlight the Distill button (tunnel step 3). */
  highlightDistill?: boolean;
}

export default function SourceDistillAction({
  conversationId,
  projectId,
  isDistilled,
  onDistilled,
  highlightDistill = false,
}: SourceDistillActionProps) {
  const router = useRouter();
  const extractInFlightRef = useRef(false);
  const extractTimeoutRef = useRef(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFirstStructuralModal, setShowFirstStructuralModal] = useState(false);
  const [firstStructuralCounts, setFirstStructuralCounts] = useState<{
    decisions: number;
    openLoops: number;
    suggestedHighlights: number;
  } | null>(null);
  const [localDistilled, setLocalDistilled] = useState(false);

  const doRefresh = () => {
    setShowSuccessModal(false);
    setShowFirstStructuralModal(false);
    setFirstStructuralCounts(null);
    onDistilled?.();
    router.refresh();
  };

  useEffect(() => {
    if (!showSuccessModal && !showFirstStructuralModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') doRefresh();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showSuccessModal, showFirstStructuralModal]);

  const handleDistill = async () => {
    if (extractInFlightRef.current) return;
    extractInFlightRef.current = true;
    setExtracting(true);
    setError(null);
    setResult(null);

    const abortController = new AbortController();
    const timeoutMs = 180_000;
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
        setError('Invalid response from server.');
        return;
      }

      if (!response.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to extract insights');
        return;
      }

      const typedResult = data as unknown as ExtractionResult;
      setResult(typedResult);

      if (typedResult.success && typedResult.insights) {
        const insights = typedResult.insights as Record<string, number>;
        track('insights_extracted', {
          conversation_id: conversationId,
          project_id: projectId,
          total_insights: typedResult.created ?? 0,
          decisions_count: insights.decisions ?? 0,
          commitments_count: insights.commitments ?? 0,
          blockers_count: insights.blockers ?? 0,
          open_loops_count: insights.openLoops ?? 0,
          highlights_count: insights.suggestedHighlights ?? 0,
        });

        const tunnelStep = getTunnelStep();
        if (tunnelStep === 3) {
          const nextCount = getTunnelDistillCount() + 1;
          setTunnelDistillCount(nextCount);
          dispatchTunnelUpdate();
          setLocalDistilled(true);
          if (nextCount === 2) {
            setTunnelStep(4);
            dispatchTunnelUpdate();
            onDistilled?.();
            router.refresh();
          }
          return;
        }
        if (typedResult.firstReduce && typedResult.counts) {
          const c = typedResult.counts;
          setFirstStructuralCounts({
            decisions: c.decisions ?? 0,
            openLoops: c.openLoops ?? 0,
            suggestedHighlights: c.suggestedHighlights ?? 0,
          });
          setShowFirstStructuralModal(true);
        } else {
          setShowSuccessModal(true);
        }
        setLocalDistilled(true);
      }
    } catch (err) {
      if (timeoutId != null) clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const isTimeout = isAbort && extractTimeoutRef.current;
      setError(
        isTimeout
          ? 'Distillation is taking too long.'
          : isAbort
            ? 'Request was canceled.'
            : err instanceof Error
              ? err.message
              : 'Failed to extract insights'
      );
    } finally {
      extractInFlightRef.current = false;
      setExtracting(false);
    }
  };

  const showAsDistilled = isDistilled || localDistilled;

  if (showAsDistilled) {
    return (
      <span className="text-xs text-[rgb(var(--muted))]">
        ✓ Distilled
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-col items-end gap-0.5">
        <button
          type="button"
          onClick={handleDistill}
          disabled={extracting}
          className={`px-3 py-1.5 text-xs font-medium border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            highlightDistill
              ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 ring-2 ring-purple-400/50 dark:ring-purple-500/50'
              : 'border-[rgb(var(--ring)/0.25)] text-[rgb(var(--text))] hover:bg-[rgb(var(--ring)/0.06)]'
          }`}
          aria-label="Distill signals from this source"
          data-onboarding="distill-signals"
        >
          {extracting ? 'Distilling…' : 'Distill signals'}
        </button>
        {error && (
          <span className="text-[0.65rem] text-red-600 dark:text-red-400 max-w-[120px] truncate">
            {error}
          </span>
        )}
      </div>

      {showFirstStructuralModal && (
        <FirstStructuralMomentModal
          counts={firstStructuralCounts}
          onContinue={async () => {
            try {
              await fetch('/api/profile/first-reduce-acknowledged', { method: 'POST', credentials: 'same-origin' });
            } catch {
              /* ignore */
            }
            doRefresh();
          }}
        />
      )}

      {showSuccessModal && result?.success && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={doRefresh}
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
              <h3 className="text-sm font-medium text-[rgb(var(--text))] mb-3">What remains</h3>
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
                type="button"
                onClick={doRefresh}
                className="px-6 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
