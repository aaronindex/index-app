// app/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = getSupabaseBrowserClient();
      
      // Get the app URL for password reset redirect
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'https://indexapp.co');
      const redirectUrl = `${appUrl}/auth/reset-password`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center">
        <div className="max-w-md w-full px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">
              Check your email
            </h1>
            <p className="text-[rgb(var(--muted))]">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800 mb-6">
            <p className="text-sm text-green-800 dark:text-green-400">
              If an account exists with this email, you'll receive a password reset link. The link will expire in 1 hour.
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-[rgb(var(--text))] hover:underline font-medium"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center">
      <div className="max-w-md w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">
            Reset your password
          </h1>
          <p className="text-[rgb(var(--muted))]">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[rgb(var(--text))] mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-[rgb(var(--text))] hover:underline font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

