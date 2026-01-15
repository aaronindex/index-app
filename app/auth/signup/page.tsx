// app/auth/signup/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import Link from 'next/link';
import { showError } from '@/lib/error-handling';
import { trackEvent } from '@/lib/analytics';
import { getStoredUTMParams, clearUTMParams } from '@/lib/utm';
import { ALPHA_MODE } from '@/lib/config/flags';

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Update page title
  useEffect(() => {
    document.title = 'Sign Up | INDEX';
  }, []);

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
    setEmailSent(false);

    // Verify invite code first (only if ALPHA_MODE is enabled)
    if (ALPHA_MODE) {
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
      } catch (err) {
        setError('Failed to verify invite code. Please try again.');
        setLoading(false);
        return;
      }
    }

    try {

      // Create account
      const supabase = getSupabaseBrowserClient();
      
      // Get the app URL for email confirmation redirect
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     (typeof window !== 'undefined' ? window.location.origin : 'https://indexapp.co');
      const redirectUrl = `${appUrl}/auth/callback`;
      
      console.log('[Signup] Attempting signup with:', {
        email,
        redirectUrl,
        appUrl,
      });
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      console.log('[Signup] Signup response:', {
        user: signUpData?.user?.id,
        email: signUpData?.user?.email,
        error: signUpError?.message,
        requiresConfirmation: !signUpData?.user,
      });

      if (signUpError) {
        console.error('[Signup] Signup error:', signUpError);
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      // Supabase returns a user object even when email confirmation is required
      // Check if user exists and if email is confirmed
      const requiresEmailConfirmation = signUpData.user && !signUpData.user.email_confirmed_at;
      
      if (!signUpData.user || requiresEmailConfirmation) {
        // Email confirmation required - show message
        console.log('[Signup] Email confirmation required - user will receive email', {
          userId: signUpData.user?.id,
          emailConfirmed: signUpData.user?.email_confirmed_at,
        });
        setError(null);
        setLoading(false);
        setEmailSent(true);
        return;
      }

      // Use invite code (increment uses) - only if ALPHA_MODE is enabled
      if (ALPHA_MODE && inviteCode.trim()) {
        await fetch('/api/invite-codes/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: inviteCode }),
        });
      }

      // Track successful signup (privacy-safe: no code string)
      const inviteCodeFromUrl = searchParams.get('code');
      const utmParams = getStoredUTMParams();
      
      trackEvent('sign_up_completed', {
        invite_present: true,
        invite_length: inviteCode.trim().length,
        invite_source: inviteCodeFromUrl ? 'url' : 'form',
        // Include UTM params for attribution
        utm_source: utmParams?.utm_source,
        utm_medium: utmParams?.utm_medium,
        utm_campaign: utmParams?.utm_campaign,
        utm_term: utmParams?.utm_term,
        utm_content: utmParams?.utm_content,
      });

      // Attach attribution to profile (first-touch only)
      const { getStoredAttribution } = await import('@/lib/analytics/attribution');
      const attribution = getStoredAttribution();
      if (attribution) {
        try {
          await fetch('/api/attribution/attach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              utm_source: attribution.utm_source,
              utm_medium: attribution.utm_medium,
              utm_campaign: attribution.utm_campaign,
              utm_content: attribution.utm_content,
              utm_term: attribution.utm_term,
              initial_referrer: attribution.initial_referrer,
              initial_landing_path: attribution.initial_landing_path,
            }),
          });
        } catch (error) {
          console.error('Failed to attach attribution:', error);
        }
      }

      // Clear UTM params after signup (attribution complete)
      clearUTMParams();

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

  if (emailSent) {
    return (
      <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center">
        <div className="max-w-md w-full px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">
              Check your email
            </h1>
            <p className="text-[rgb(var(--muted))] mb-6">
              We've sent a confirmation link to <strong>{email}</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 ring-1 ring-green-200 dark:ring-green-800 mb-6">
            <p className="text-sm text-green-800 dark:text-green-400">
              Click the link in the email to activate your account. The link will expire in 24 hours.
            </p>
            <p className="text-xs text-green-700 dark:text-green-500 mt-2">
              Didn't receive the email? Check your spam folder or try signing up again.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Back to Sign In
            </Link>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
                setPassword('');
                setInviteCode('');
              }}
              className="text-sm text-[rgb(var(--text))] hover:underline opacity-70"
            >
              Try a different email
            </button>
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
