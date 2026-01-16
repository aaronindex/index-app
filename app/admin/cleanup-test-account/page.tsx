// app/admin/cleanup-test-account/page.tsx
// Admin page to cleanup test accounts

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';

export default function CleanupTestAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCleanup = async () => {
    if (confirm !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/cleanup-test-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, confirm }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cleanup account');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center px-4 py-12">
      <Card className="p-8 max-w-md w-full">
        <h1 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-2">
          Cleanup Test Account
        </h1>
        <p className="text-sm text-[rgb(var(--muted))] mb-6">
          This will permanently delete the account, profile, Stripe subscription, and all related data.
          <strong className="text-red-600 dark:text-red-400"> This action cannot be undone.</strong>
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 border border-[rgb(var(--ring))] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-[rgb(var(--text))] mb-1">
              Type DELETE to confirm
            </label>
            <input
              id="confirm"
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-[rgb(var(--ring))] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
            />
          </div>

          <Button
            onClick={handleCleanup}
            disabled={loading || confirm !== 'DELETE' || !email}
            variant="primary"
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Cleaning up...' : 'Delete Account & Subscription'}
          </Button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-800 dark:text-green-400">
            <h3 className="font-semibold mb-2">Cleanup Complete</h3>
            <p className="text-sm mb-2">Account: {result.email}</p>
            <p className="text-sm mb-2">User ID: {result.userId}</p>
            <div className="text-sm mt-2">
              <p className="font-medium mb-1">Steps completed:</p>
              <ul className="list-disc list-inside space-y-1">
                {result.cleanupSteps.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="text-sm mt-2 text-yellow-600 dark:text-yellow-400">
                <p className="font-medium mb-1">Warnings:</p>
                <ul className="list-disc list-inside space-y-1">
                  {result.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-800 dark:text-red-400">
            <h3 className="font-semibold mb-2">Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-[rgb(var(--ring))]">
          <button
            onClick={() => router.push('/home')}
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]"
          >
            ← Back to Home
          </button>
        </div>
      </Card>
    </main>
  );
}

