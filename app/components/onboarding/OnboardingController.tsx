'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOnboardingState,
  getOnboardingStep,
  setOnboardingStep,
  markOnboardingCompleted,
  clearOnboardingStep,
} from '@/lib/onboarding/state';

export default function OnboardingController() {
  const router = useRouter();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOnboardingState().then((state) => {
      if (!cancelled) setCompleted(state.completed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setStep(getOnboardingStep());
  }, [completed]);

  const showStep1 = completed === false && (step === null || step === 1);
  const showStep7 = completed === false && step === 7;

  const handleStart = () => {
    setOnboardingStep(2);
    setStep(2);
    router.push('/import');
  };

  const handleYoureReady = async () => {
    await markOnboardingCompleted();
    clearOnboardingStep();
    setCompleted(true);
    setStep(null);
  };

  if (completed !== false) return null;

  // Step 1 — Concept introduction (no skip)
  if (showStep1) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step1-heading"
      >
        <div className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)] text-center">
          <h2
            id="onboarding-step1-heading"
            className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4"
          >
            Thinking happens everywhere. INDEX keeps what matters.
          </h2>
          <p className="text-sm text-[rgb(var(--muted))] mb-6 whitespace-pre-wrap">
            Import a conversation.{'\n'}
            Distill signals.{'\n'}
            Watch structure emerge.
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // Step 7 — Home / Direction
  if (showStep7) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step7-heading"
      >
        <div className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)] text-center">
          <h2
            id="onboarding-step7-heading"
            className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4"
          >
            INDEX reflects where your thinking is headed.
          </h2>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Direction evolves as decisions accumulate.
          </p>
          <button
            type="button"
            onClick={handleYoureReady}
            className="px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            You&apos;re ready
          </button>
        </div>
      </div>
    );
  }

  return null;
}
