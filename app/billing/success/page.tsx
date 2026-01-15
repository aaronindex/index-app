// app/billing/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { track } from '@/lib/analytics/track';

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'checking' | 'success' | 'timeout'>('checking');
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Fire initial view event
    track('billing_checkout_success_viewed', {
      plan: 'pro',
      price_usd: 30,
    });

    // Poll for plan activation
    const pollInterval = setInterval(async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        clearInterval(pollInterval);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (profile?.plan === 'pro') {
        clearInterval(pollInterval);
        const latency = Date.now() - startTime;

        // Fire activation event
        track('billing_pro_activated', {
          plan: 'pro',
          price_usd: 30,
          latency_ms: latency,
        });

        setStatus('success');

        // Redirect after short delay
        setTimeout(() => {
          router.push('/home');
        }, 1500);
      }
    }, 1000);

    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setStatus('timeout');
    }, 15000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [router, startTime]);

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'checking' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
            <h1 className="text-2xl font-semibold text-foreground">Activating your subscription...</h1>
            <p className="text-[rgb(var(--muted))]">This should only take a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-semibold text-foreground">Welcome to Pro!</h1>
            <p className="text-[rgb(var(--muted))]">Your subscription is now active. Redirecting...</p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Subscription processing</h1>
            <p className="text-[rgb(var(--muted))] mb-4">
              Your payment was successful, but activation is taking longer than expected. You'll receive an email confirmation shortly.
            </p>
            <button
              onClick={() => router.push('/home')}
              className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </main>
  );
}

