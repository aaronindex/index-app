// app/components/ProcessStructureJobsButton.tsx
// Dev-only button to manually trigger structure job processing
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Only show in development (NODE_ENV is inlined at build; production builds never show this)
const SHOW_DEV_BUTTON = process.env.NODE_ENV === 'development';

export default function ProcessStructureJobsButton() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{
    processed: number;
    succeeded: string[];
    failed: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!SHOW_DEV_BUTTON) {
    return null;
  }

  const handleProcess = async () => {
    setProcessing(true);
    setStatus(null);
    setError(null);

    try {
      // Get admin secret from env (dev-only: set NEXT_PUBLIC_INDEX_ADMIN_SECRET in .env.local)
      // Note: This exposes the secret to the client, which is acceptable for dev-only features
      const adminSecret = process.env.NEXT_PUBLIC_INDEX_ADMIN_SECRET || process.env.INDEX_ADMIN_SECRET;
      
      if (!adminSecret) {
        throw new Error('INDEX_ADMIN_SECRET not configured. Set NEXT_PUBLIC_INDEX_ADMIN_SECRET in .env.local for dev.');
      }

      const response = await fetch('/api/structure-jobs/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-index-admin-secret': adminSecret,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process jobs');
      }

      const data = await response.json();
      setStatus({
        processed: data.processed || 0,
        succeeded: data.succeeded || [],
        failed: data.failed || [],
      });

      // Refresh the page to show updated state
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process jobs');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleProcess}
        disabled={processing}
        className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {processing ? 'Processing...' : 'Process structure jobs'}
      </button>

      {status && (
        <div className="text-xs text-[rgb(var(--muted))] space-y-1">
          <div>Processed {status.processed}</div>
          {status.failed.length > 0 && (
            <div className="text-red-600 dark:text-red-400">
              Failed: {status.failed.join(', ')}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
