'use client';

import { useState, useEffect } from 'react';
import SpotlightTour from '@/app/components/onboarding/SpotlightTour';
import type { SpotlightStep } from '@/app/components/onboarding/SpotlightTour';
import { getOnboardingStep } from '@/lib/onboarding/state';

const STEP_3_SPOTLIGHT: SpotlightStep[] = [
  {
    id: 'distill',
    title: 'Distill signals from this source.',
    body: (
      <>
        Extract decisions, tasks, and insights.
        <br />
        The rest fades.
      </>
    ),
    targetSelector: '[data-onboarding="distill-signals"]',
    placement: 'bottom',
  },
];

export default function OnboardingStep3Spotlight() {
  const [step, setStep] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setStep(getOnboardingStep());
  }, []);

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
