// app/conversations/[id]/components/ExtractInsightsButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics/track';

interface ExtractInsightsButtonProps {
  conversationId: string;
  projectId: string | null;
}

export default function ExtractInsightsButton({ conversationId, projectId }: ExtractInsightsButtonProps) {
  const router = useRouter();
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
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    if (!showSuccessModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSuccessModal(false);
        router.refresh();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showSuccessModal, router]);

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/insights/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract insights');
      }

      const data = await response.json();
      setResult(data);

      // Track insights extraction event
      if (data.success) {
        const eventParams = {
          conversation_id: conversationId,
          project_id: projectId || null,
          total_insights: data.created,
          decisions_count: data.insights.decisions,
          commitments_count: data.insights.commitments,
          blockers_count: data.insights.blockers,
          open_loops_count: data.insights.openLoops,
          highlights_count: data.insights.suggestedHighlights,
        };
        
        track('insights_extracted', eventParams);
        console.log('[Analytics] insights_extracted', eventParams);
        
        // Show success modal
        setShowSuccessModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract insights');
    } finally {
      setExtracting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="relative group">
        <button
          disabled
          className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-lg cursor-not-allowed font-medium"
        >
          REDUCE
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Assign this conversation to a project to enable Reduce.
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleExtract}
        disabled={extracting}
        className="px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {extracting ? 'Reducing...' : 'REDUCE'}
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Success Modal */}
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
                Reduced
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

