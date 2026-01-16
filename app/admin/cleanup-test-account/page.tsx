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
  const [mode, setMode] = useState<'soft' | 'hard'>('soft');
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
        body: JSON.stringify({ email, confirm, mode }),
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
          Choose cleanup mode. <strong className="text-red-600 dark:text-red-400">This action cannot be undone.</strong>
        </p>

        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
          <label className="block text-sm font-medium text-[rgb(var(--text))] mb-3">
            Cleanup Mode
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="soft"
                checked={mode === 'soft'}
                onChange={(e) => setMode(e.target.value as 'soft' | 'hard')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-[rgb(var(--text))]">Soft Delete (Recommended)</div>
                <div className="text-xs text-[rgb(var(--muted))]">
                  • Cancels Stripe subscription<br/>
                  • Preserves Stripe customer for audit trail<br/>
                  • Updates email to free it up for reuse<br/>
                  • Preserves billing events and profile data<br/>
                  <strong>Best for: Testing with email reuse</strong>
                </div>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="hard"
                checked={mode === 'hard'}
                onChange={(e) => setMode(e.target.value as 'soft' | 'hard')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-[rgb(var(--text))]">Hard Delete</div>
                <div className="text-xs text-[rgb(var(--muted))]">
                  • Cancels and deletes Stripe subscription<br/>
                  • Deletes Stripe customer completely<br/>
                  • Deletes all database records<br/>
                  • Deletes auth user<br/>
                  <strong>Best for: Complete cleanup, no audit trail needed</strong>
                </div>
              </div>
            </label>
          </div>
        </div>

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
            className={`w-full ${mode === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {loading ? 'Cleaning up...' : mode === 'hard' ? 'Hard Delete Account' : 'Soft Delete Account'}
          </Button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-800 dark:text-green-400">
            <h3 className="font-semibold mb-2">Cleanup Complete</h3>
            <p className="text-sm mb-2">Account: {result.email}</p>
            <p className="text-sm mb-2">User ID: {result.userId}</p>
            <p className="text-sm mb-2">Mode: <strong>{result.mode === 'soft' ? 'Soft Delete' : 'Hard Delete'}</strong></p>
            {result.note && (
              <p className="text-sm mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-800 dark:text-blue-400">
                {result.note}
              </p>
            )}
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

