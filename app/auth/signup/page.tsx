// app/auth/signup/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import { showError } from '@/lib/error-handling';
import { trackEvent } from '@/lib/analytics';

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill invite code from URL if provided
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Verify invite code first
    if (!inviteCode.trim()) {
      setError('Invite code is required');
      setLoading(false);
      return;
    }

    try {
      // Verify invite code
      const verifyResponse = await fetch('/api/invite-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.valid) {
        setError(verifyData.error || 'Invalid invite code');
        setLoading(false);
        return;
      }

      // Create account
      const supabase = getSupabaseBrowserClient();
      
      // Get the app URL for email confirmation redirect
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'https://indexapp.co');
      const redirectUrl = `${appUrl}/auth/callback`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      // If user is null, it means email confirmation is required
      if (!signUpData.user) {
        // Email confirmation required - show message
        setError(null);
        setLoading(false);
        // Show success message instead of error
        alert('Please check your email to confirm your account. The confirmation link will expire in 24 hours.');
        router.push('/auth/signin');
        return;
      }

      // Use invite code (increment uses)
      await fetch('/api/invite-codes/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });

      // Track successful signup (privacy-safe: no code string)
      const inviteCodeFromUrl = searchParams.get('code');
      trackEvent('sign_up_completed', {
        invite_present: true,
        invite_length: inviteCode.trim().length,
        invite_source: inviteCodeFromUrl ? 'url' : 'form',
      });

      // Profile will be auto-created via database trigger
      // Redirect to home
      router.push('/home');
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
      showError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center">
      <div className="max-w-md w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">
            Create your INDEX account
          </h1>
          <p className="text-[rgb(var(--muted))]">
            Personal Business Intelligence for your AI life.
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-6">
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

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[rgb(var(--text))] mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="inviteCode"
              className="block text-sm font-medium text-[rgb(var(--text))] mb-2"
            >
              Invite Code <span className="text-red-500">*</span>
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)] uppercase"
              placeholder="ABC123"
            />
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">
              Alpha access requires an invite code
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[rgb(var(--muted))]">
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="text-[rgb(var(--text))] hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center">
        <div className="text-[rgb(var(--muted))]">Loading...</div>
      </main>
    }>
      <SignUpForm />
    </Suspense>
  );
}
