// app/pricing/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { track } from '@/lib/analytics/track';
import { getStoredAttribution } from '@/lib/analytics/attribution';
import { ALPHA_MODE } from '@/lib/config/flags';
import UpgradeModal from '@/app/components/billing/UpgradeModal';

// Free tier limits (from env/config or defaults)
// TODO: These should ideally be fetched from server or use NEXT_PUBLIC_ env vars
// For now, using hardcoded defaults that match lib/limits.ts
const FREE_MAX_ACTIVE_PROJECTS = 1;
const FREE_MAX_ASK_PER_24H = 15;
const FREE_MAX_DIGEST_PER_30D = 4;
const FREE_ASSET_UPLOADS_ENABLED = false;

export default function PricingPage() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    // Check if user is signed in
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsSignedIn(!!user);
    };
    checkAuth();

    // Track pricing page view
    const attribution = getStoredAttribution();
    track('pricing_viewed', {
      utm_source: attribution?.utm_source,
      utm_medium: attribution?.utm_medium,
      utm_campaign: attribution?.utm_campaign,
      utm_content: attribution?.utm_content,
      utm_term: attribution?.utm_term,
    });
  }, []);

  const handleUpgrade = () => {
    if (isSignedIn) {
      // Show upgrade modal for signed-in users
      setShowUpgradeModal(true);
    } else {
      // Route to sign-in with redirect back to pricing
      router.push(`/auth/signin?redirect=${encodeURIComponent('/pricing')}`);
    }
  };

  const handleGetStarted = () => {
    if (ALPHA_MODE) {
      router.push('/auth/signup');
    } else {
      router.push('/auth/signup');
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
            INDEX Pro — $30/month
          </h1>
          <p className="text-lg text-[rgb(var(--muted))]">
            Try INDEX free. Upgrade when you hit the free limits.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Free Column */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Free</h2>
            <ul className="space-y-3 text-sm text-[rgb(var(--muted))]">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>{FREE_MAX_ACTIVE_PROJECTS} active project</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Quick import only (paste a chat)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Links in Project Library {FREE_ASSET_UPLOADS_ENABLED ? '(limited uploads)' : '(no uploads)'}</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ask Index capped ({FREE_MAX_ASK_PER_24H} queries per 24h)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>{FREE_MAX_DIGEST_PER_30D} Weekly Digests in first 30 days (use it or lose it)</span>
              </li>
            </ul>
          </div>

          {/* Pro Column */}
          <div className="border-2 border-foreground rounded-lg p-6 bg-white dark:bg-zinc-950">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Pro</h2>
            <ul className="space-y-3 text-sm text-[rgb(var(--muted))]">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Unlimited projects</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Full JSON import</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Uploads in Project Library</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Higher/removed caps</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Get started (free)
          </button>
          <button
            onClick={handleUpgrade}
            className="w-full sm:w-auto px-6 py-3 border-2 border-foreground rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          source="pricing_page"
        />
      )}
    </main>
  );
}

