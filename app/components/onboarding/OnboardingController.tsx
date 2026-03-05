'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SpotlightTour from './SpotlightTour';
import type { SpotlightStep } from './SpotlightTour';
import { getOnboardingState, markOnboardingCompleted } from '@/lib/onboarding/state';

const ONBOARDING_STEPS: SpotlightStep[] = [
  {
    id: 'projects',
    body: (
      <>
        Anything you save lives inside a project.
        <br />
        Projects are simple containers.
        <br />
        Structure emerges across them.
        <br />
        No hierarchy.
        <br />
        No complexity.
      </>
    ),
    targetSelector: '[data-onboarding="nav-projects"]',
    placement: 'bottom',
  },
  {
    id: 'import',
    body: (
      <>
        Import a conversation to get started.
        <br />
        Paste a chat from ChatGPT, Claude, or Cursor.
      </>
    ),
    targetSelector: '[data-onboarding="nav-import"]',
    placement: 'bottom',
    actionLabel: 'Import a conversation',
    onAction: () => {},
  },
  {
    id: 'direction',
    body: (
      <>
        As decisions accumulate, Direction becomes visible.
        <br />
        Direction isn&apos;t written. It forms over time.
        <br />
        Shifts mark meaningful change.
      </>
    ),
    targetSelector: '[data-onboarding="direction-panel"]',
    placement: 'right',
  },
  {
    id: 'extension',
    body: (
      <>
        Capture moments while you think.
        <br />
        Install the extension to save in real time.
      </>
    ),
    targetSelector: '[data-onboarding="extension-link"]',
    placement: 'top',
    actionLabel: 'Install extension',
    onAction: () => {},
  },
];

export default function OnboardingController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const isRestart = searchParams.get('tour') === 'restart';

  useEffect(() => {
    let cancelled = false;
    getOnboardingState().then((state) => {
      if (!cancelled) setOnboardingCompleted(state.completed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRestart) return;
    setOnboardingCompleted(false);
    router.replace('/home');
  }, [isRestart, router]);

  const showTour = onboardingCompleted === false || isRestart;

  const steps = useMemo(() => {
    return ONBOARDING_STEPS.map((s) => {
      if (s.id === 'import') {
        return { ...s, onAction: () => router.push('/import') };
      }
      if (s.id === 'extension') {
        return { ...s, onAction: () => router.push('/extension') };
      }
      return s;
    });
  }, [router]);

  const handleClose = async () => {
    await markOnboardingCompleted();
    setOnboardingCompleted(true);
  };

  const handleComplete = async () => {
    await markOnboardingCompleted();
    setOnboardingCompleted(true);
  };

  if (!showTour) return null;

  return (
    <SpotlightTour
      isOpen={showTour}
      steps={steps}
      initialStepId="projects"
      onClose={handleClose}
      onComplete={handleComplete}
    />
  );
}
