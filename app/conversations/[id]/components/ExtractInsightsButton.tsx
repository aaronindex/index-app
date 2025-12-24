// app/conversations/[id]/components/ExtractInsightsButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

      // Refresh the page after a short delay to show new insights
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract insights');
    } finally {
      setExtracting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="space-y-2">
        <div className="relative group">
          <button
            disabled
            className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 rounded-lg cursor-not-allowed font-medium"
          >
            ✨ Extract Insights
          </button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Link conversation to a project first
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100"></div>
          </div>
        </div>
        <Link
          href="/unassigned"
          className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors underline"
        >
          Assign to project →
        </Link>
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
        {extracting ? 'Extracting Insights...' : '✨ Extract Insights'}
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {result && result.success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
            ✓ Extracted {result.created} insights
          </p>
          <div className="text-xs text-green-700 dark:text-green-500 space-y-1">
            {result.insights.decisions > 0 && (
              <p>• {result.insights.decisions} decision{result.insights.decisions !== 1 ? 's' : ''}</p>
            )}
            {result.insights.commitments > 0 && (
              <p>• {result.insights.commitments} commitment{result.insights.commitments !== 1 ? 's' : ''}</p>
            )}
            {result.insights.blockers > 0 && (
              <p>• {result.insights.blockers} blocker{result.insights.blockers !== 1 ? 's' : ''}</p>
            )}
            {result.insights.openLoops > 0 && (
              <p>• {result.insights.openLoops} open loop{result.insights.openLoops !== 1 ? 's' : ''}</p>
            )}
            {result.insights.suggestedHighlights > 0 && (
              <p>• {result.insights.suggestedHighlights} highlight{result.insights.suggestedHighlights !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

