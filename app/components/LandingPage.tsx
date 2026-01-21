'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { trackEvent } from '@/lib/analytics';
import { captureUTMParams, getUTMParamsForAnalytics } from '@/lib/utm';
import { captureAttribution } from '@/lib/analytics/attribution';
import { ALPHA_MODE } from '@/lib/config/flags';
import MonitorScreenshotPanel from './landing/MonitorScreenshotPanel';
import ValueCard from './landing/ValueCard';
import InviteCodeInput from './landing/InviteCodeInput';
import ExpandableWaitlist from './landing/ExpandableWaitlist';
import CookieNotice from './CookieNotice';

export default function LandingPage() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Force light theme for landing page (ignore user's previous theme preference)
    // This ensures consistent styling regardless of localStorage theme preference
    if (mounted && resolvedTheme && resolvedTheme !== 'light') {
      setTheme('light');
    }
  }, [mounted, resolvedTheme, setTheme]);

  useEffect(() => {
    // Capture UTM params from URL and store for attribution
    captureUTMParams();
    
    // Capture attribution (first-touch only)
    captureAttribution();

    // Fire landing_page_view analytics event with page context
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const referrer = document.referrer ? new URL(document.referrer) : null;
      const utmParams = getUTMParamsForAnalytics();
      
      trackEvent('landing_page_view', {
        page_type: 'landing',
        path: window.location.pathname,
        referrer_host: referrer?.host || undefined,
        ...utmParams,
      });
    }
  }, []);

  return (
    <>
      <main className="min-h-screen bg-[#FAF8F6] dark:bg-[#121211]">
      {/* 1) HERO SECTION */}
      <section className="w-full py-20 sm:py-28 relative overflow-hidden bg-[#121211]">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-20 items-center gap-12 lg:gap-16">
            {/* Left column: Copy + CTA (45%) */}
            <div className="text-center lg:text-left lg:col-span-9">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-6 text-white leading-[1.1]">
                The memory your AI doesn't have.
              </h1>
              <p className="text-lg sm:text-xl lg:text-xl opacity-80 max-w-xl mx-auto lg:mx-0 mb-8 text-white leading-tight lg:whitespace-nowrap">
                Personal Business Intelligence for your thinking.
              </p>
              
              {/* Bulletless list */}
              <div className="space-y-2.5 text-base sm:text-lg opacity-75 mb-10 text-white max-w-xl mx-auto lg:mx-0">
                <p>Import conversations, notes, or drafts — from ChatGPT, Claude, Cursor, or anywhere else.</p>
                <p>Organize into projects, highlights, tasks, decisions</p>
                <p>Move with what matters next — without continuing the loop</p>
              </div>

              {/* Invite code input or direct CTA */}
              {ALPHA_MODE ? (
                <>
                  <div className="mb-6">
                    <InviteCodeInput variant="hero" />
                  </div>

                  {/* Secondary link */}
                  <div className="mb-4">
                    <Link
                      href="mailto:hello@indexapp.co?subject=INDEX Invite Request"
                      className="text-sm text-white opacity-70 hover:opacity-100 transition-opacity underline"
                    >
                      Request an invite
                    </Link>
                  </div>

                  {/* Trust microcopy */}
                  <p className="text-sm opacity-60 text-white mb-4">
                    Invite-only alpha. No training on your data. Export anytime.
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <Link
                      href="/auth/signup"
                      className="inline-block px-6 py-3 bg-white text-[#121211] rounded-lg hover:opacity-90 transition-opacity font-medium"
                    >
                      Get started
                    </Link>
                  </div>

                  {/* Trust microcopy */}
                  <p className="text-sm opacity-60 text-white mb-4">
                    No training on your data. Export anytime.
                  </p>
                </>
              )}

              {/* Expandable waitlist */}
              <div>
                <ExpandableWaitlist source="lp_hero_inline" />
              </div>
            </div>

            {/* Right column: Macbook mock - no frame, enlarged (55%) */}
            <div className="flex justify-center lg:justify-end order-first lg:order-last lg:col-span-11">
              <div className="w-full max-w-2xl lg:max-w-4xl">
                <img
                  src="/marketing/hero-macbook.png"
                  alt="INDEX screenshot"
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.parentElement?.querySelector('.placeholder');
                    if (placeholder) {
                      (placeholder as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
                <div className="placeholder hidden items-center justify-center aspect-video bg-white/5 rounded-lg">
                  <p className="text-white text-sm opacity-40">Screenshot placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2) VALUE CARDS SECTION */}
      <section className="w-full py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            <ValueCard
              title="Import"
              body="Paste or upload conversations, notes, or drafts — from AI tools or anywhere else."
              imageSrc="/import-icon-cubes.png"
            />
            <ValueCard
              title="Organize"
              body="Assign to projects. Distill highlights, tasks, decisions."
              imageSrc="/organize-icon-cubes.png"
            />
            <ValueCard
              title="Move"
              body="Carry what remains."
              imageSrc="/move-icon-cubes.png"
            />
          </div>
        </div>
      </section>

      {/* 3) HOW INDEX WORKS SECTION */}
      <section className="w-full py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered heading */}
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-[#121211] dark:text-[#FAF8F6]">
              How INDEX works
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 items-start gap-12 lg:gap-16">
            {/* Left column: Steps (40%) */}
            <div className="text-center lg:text-left lg:col-span-2">
              <div className="space-y-6">
                <div>
                  <div className="inline-block text-xs font-semibold tracking-wider uppercase opacity-60 mb-2 text-[#121211] dark:text-[#FAF8F6]">
                    Think
                  </div>
                  <p className="text-base opacity-75 text-[#121211] dark:text-[#FAF8F6]">In AI, meetings, documents, or anywhere ideas form</p>
                </div>
                <div>
                  <div className="inline-block text-xs font-semibold tracking-wider uppercase opacity-60 mb-2 text-[#121211] dark:text-[#FAF8F6]">
                    Import
                  </div>
                  <p className="text-base opacity-75 text-[#121211] dark:text-[#FAF8F6]">Bring conversations into INDEX</p>
                </div>
                <div>
                  <div className="inline-block text-xs font-semibold tracking-wider uppercase opacity-60 mb-2 text-[#121211] dark:text-[#FAF8F6]">
                    Organize
                  </div>
                  <p className="text-base opacity-75 text-[#121211] dark:text-[#FAF8F6]">Distill into highlights, tasks, decisions</p>
                </div>
                <div>
                  <div className="inline-block text-xs font-semibold tracking-wider uppercase opacity-60 mb-2 text-[#121211] dark:text-[#FAF8F6]">
                    Move
                  </div>
                  <p className="text-base opacity-75 text-[#121211] dark:text-[#FAF8F6]">Carry what remains</p>
                </div>
              </div>
            </div>

            {/* Right column: Display mock - no frame, enlarged (60%) */}
            <div className="flex justify-center lg:justify-start order-first lg:order-last lg:col-span-3">
              <div className="w-full max-w-2xl lg:max-w-4xl">
                <img
                  src="/marketing/section-display.png"
                  alt="INDEX display"
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.parentElement?.querySelector('.placeholder');
                    if (placeholder) {
                      (placeholder as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
                <div className="placeholder hidden items-center justify-center aspect-video bg-gray-100 rounded-lg">
                  <p className="text-gray-400 text-sm opacity-40">Display placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4) PRIVATE BY DESIGN SECTION */}
      <section className="w-full py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight mb-10 text-[#121211] dark:text-[#FAF8F6]">
            Private by design.
          </h2>
          <div className="space-y-4 text-lg opacity-75 text-[#121211] dark:text-[#FAF8F6] max-w-2xl mx-auto">
            <p>Your data is not used for training.</p>
            <p>Export everything as JSON.</p>
            <p>Delete your account anytime.</p>
            <p>Redactions prevent sensitive text from resurfacing.</p>
          </div>
        </div>
      </section>

      {/* 5) CLOSING CTA SECTION */}
      <section className="w-full py-20 sm:py-28 bg-[#121211]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-8 text-white">
            Start with one conversation. INDEX remembers the rest.
          </h2>
          {ALPHA_MODE ? (
            <>
              <div className="mb-6">
                <InviteCodeInput variant="compact" darkBg={true} />
              </div>
              <p className="text-sm opacity-60 text-white">
                <Link
                  href="mailto:hello@indexapp.co?subject=INDEX Invite Request"
                  className="underline hover:opacity-80 transition-opacity"
                >
                  Request an invite
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <Link
                  href="/auth/signup"
                  className="inline-block px-6 py-3 bg-white text-[#121211] rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Try it Free
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      </main>
      <CookieNotice />
    </>
  );
}
