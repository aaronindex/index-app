'use client';

import { useState, useEffect, useRef } from 'react';
import SpotlightTour from '@/app/components/onboarding/SpotlightTour';
import type { SpotlightStep } from '@/app/components/onboarding/SpotlightTour';
import { getOnboardingStep } from '@/lib/onboarding/state';

const STEP_3_SPOTLIGHT: SpotlightStep[] = [
  {
    id: 'distill',
    title: 'Distill signals from this source.',
    body: (
      <>
        Distill signals to extract decisions, tasks, and insights from this source.
      </>
    ),
    targetSelector: '[data-onboarding="distill-signals"]',
    placement: 'bottom',
  },
];

export default function OnboardingStep3Spotlight() {
  const [step, setStep] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const scrollDoneRef = useRef(false);

  useEffect(() => {
    setStep(getOnboardingStep());
  }, []);

  // Scroll Distill button into view when step 3 is active so it's visible when spotlight mounts
  useEffect(() => {
    if (step !== 3 || dismissed || scrollDoneRef.current) return;
    const el = document.querySelector('[data-onboarding="distill-signals"]');
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrollDoneRef.current = true;
    }
  }, [step, dismissed]);

  const show = step === 3 && !dismissed;

  if (!show) return null;

  return (
    <SpotlightTour
      isOpen={true}
      steps={STEP_3_SPOTLIGHT}
      initialStepId="distill"
      onClose={() => setDismissed(true)}
      onComplete={() => setDismissed(true)}
    />
  );
}
