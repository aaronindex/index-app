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
  const [reduceMotion, setReduceMotion] = useState(false);

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
          {/* Background video / poster + overlays */}
          <div className="absolute inset-0 pointer-events-none">
            {!reduceMotion ? (
              <video
                className="w-full h-full object-cover"
                src="/index-hero-video.mp4"
                poster="/index-hero-video.jpg"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src="/index-hero-video.jpg"
                alt="INDEX hero background"
                className="w-full h-full object-cover"
              />
            )}
            {/* Grain overlay */}
            <div className="absolute inset-0 opacity-10 mix-blend-soft-light bg-[radial-gradient(circle,_rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:4px_4px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:gap-16">
            {/* Left column: Copy + CTA (45%) */}
            <div className="text-center lg:text-left lg:col-span-9">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-6 text-white leading-[1.1]">
                INDEX isn&apos;t memory —
                <br />
                it&apos;s direction.
              </h1>
              <p className="text-lg sm:text-xl lg:text-xl opacity-80 max-w-xl mx-auto lg:mx-0 mb-6 text-white leading-tight">
                Built for people who think with AI — and move forward.
              </p>

              {/* AI anchor line + supporting line */}
              <div className="space-y-3 text-base sm:text-lg opacity-80 mb-10 text-white max-w-xl mx-auto lg:mx-0">
                <p className="font-medium">
                  AI makes it easy to generate ideas.
                  <br />
                  INDEX helps you see where those ideas are going.
                </p>
                <p className="text-sm sm:text-base opacity-90">
                  Capture conversations. Distill what matters. Move forward.
                </p>
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

          </div>
          </div>
        </section>

        {/* 2) VALUE CARDS SECTION */}
        <section className="w-full py-20 sm:py-28 bg-[#1e1e1e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            <ValueCard
              title="Import"
              body="Paste conversations from ChatGPT, Claude, or Cursor."
              imageSrc="/cubes-new1.png"
              backgroundImageSrc="/cubes-background.jpg"
              dark
            />
            <ValueCard
              title="Distill"
              body="Extract decisions, open loops, and next steps."
              imageSrc="/cubes-new2.png"
              backgroundImageSrc="/cubes-background.jpg"
              dark
            />
            <ValueCard
              title="Move"
              body="Carry forward what still matters."
              imageSrc="/cubes-new3.png"
              backgroundImageSrc="/cubes-background.jpg"
              dark
            />
          </div>
        </div>
        </section>

        {/* 3) HOW INDEX WORKS SECTION */}
        <section className="w-full py-20 sm:py-28 relative bg-[#050505]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Centered heading */}
            <div className="text-center mb-12 lg:mb-16">
              <h2 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-white">
                How INDEX works
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 items-start gap-12 lg:gap-16">
              {/* Left column: Steps (40%) */}
              <div className="text-center lg:text-left lg:col-span-2">
                <div className="space-y-6">
                  <div>
                    <div className="inline-block text-xs font-semibold tracking-wider uppercase mb-2 text-white/60">
                      Think
                    </div>
                    <p className="text-base text-white/80">
                      In ChatGPT, Claude, or Cursor.
                    </p>
                  </div>
                  <div>
                    <div className="inline-block text-xs font-semibold tracking-wider uppercase mb-2 text-white/60">
                      Capture
                    </div>
                    <p className="text-base text-white/80">
                      Bring conversations into INDEX.
                    </p>
                  </div>
                  <div>
                    <div className="inline-block text-xs font-semibold tracking-wider uppercase mb-2 text-white/60">
                      Reduce
                    </div>
                    <p className="text-base text-white/80">
                      Distill decisions, open loops, and highlights.
                    </p>
                  </div>
                  <div>
                    <div className="inline-block text-xs font-semibold tracking-wider uppercase mb-2 text-white/60">
                      Continue
                    </div>
                    <p className="text-base text-white/80">
                      Move forward with what remains.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right column: Display mock - no frame, enlarged (60%) */}
              <div className="flex justify-center lg:justify-start order-first lg:order-last lg:col-span-3">
                <div className="w-full max-w-2xl lg:max-w-4xl">
                  <img
                    src="/hero-macbook-new.jpg"
                    alt="INDEX Project Read view"
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
                    <p className="text-white text-sm opacity-40">Display placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4) PRIVATE BY DESIGN SECTION */}
        <section className="w-full py-20 sm:py-28 bg-[#1e1e1e]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight mb-10 text-white">
            Private by design.
          </h2>
          <div className="space-y-4 text-lg text-white/80 max-w-2xl mx-auto">
            <p>Your data is never used for training.</p>
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
            Start with one conversation.
          </h2>
          <p className="text-lg sm:text-xl opacity-75 text-white mb-8">
            Carry forward what matters.
          </p>
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
