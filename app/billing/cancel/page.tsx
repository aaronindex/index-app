// app/billing/cancel/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { track } from '@/lib/analytics/track';

export default function BillingCancelPage() {
  const router = useRouter();

  useEffect(() => {
    // Fire cancel view event
    track('billing_checkout_canceled_viewed', {
      plan: 'pro',
      price_usd: 30,
    });
  }, []);

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Checkout canceled</h1>
        <p className="text-[rgb(var(--muted))]">
          No charges were made. You can upgrade anytime from your account settings.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/home"
            className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

