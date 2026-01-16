// app/billing/manual-activate/page.tsx
// Manual subscription activation page

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';

export default function ManualActivatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/billing/manual-activate', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate subscription');
      }

      setResult(data);
      
      // Refresh the page after a short delay to show updated plan
      setTimeout(() => {
        router.push('/settings');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8">
        <h1 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">
          Manual Subscription Activation
        </h1>
        <p className="text-[rgb(var(--muted))] mb-6">
          This will find your active Stripe subscription and activate your Pro plan.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-400">
              {result.message}
            </p>
            {result.plan && (
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Plan: {result.plan} • Status: {result.subscription_status}
              </p>
            )}
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Redirecting to settings...
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleActivate}
            disabled={loading || !!result}
            variant="primary"
          >
            {loading ? 'Activating...' : 'Activate Subscription'}
          </Button>
          <Button
            onClick={() => router.push('/settings')}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </main>
  );
}

