'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getOnboardingStep, setOnboardingStep } from '@/lib/onboarding/state';

export default function OnboardingProjectOverlay() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = typeof params?.id === 'string' ? params.id : null;
  const tab = searchParams.get('tab') || 'read';
  const activeTab = tab === 'signals' ? 'signals' : tab === 'chats' ? 'chats' : 'read';

  const [step, setStepState] = useState<number | null>(null);

  useEffect(() => {
    setStepState(getOnboardingStep());
  }, []);

  const showStep5 = step === 5 && activeTab === 'signals' && projectId;
  const showStep6 = step === 6 && activeTab === 'read' && projectId;

  if (!projectId) return null;

  if (showStep5) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step5-heading"
      >
        <div className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)] text-center">
          <h2
            id="onboarding-step5-heading"
            className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4"
          >
            Signals are the ledger of your thinking.
          </h2>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Decisions, tasks, insights, and results accumulate here.
          </p>
          <button
            type="button"
            onClick={() => {
              setOnboardingStep(6);
              setStepState(6);
              router.push(`/projects/${projectId}?tab=read`);
            }}
            className="px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            See structure
          </button>
        </div>
      </div>
    );
  }

  if (showStep6) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step6-heading"
      >
        <div className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)] text-center">
          <h2
            id="onboarding-step6-heading"
            className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4"
          >
            Structure reflects the work.
          </h2>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Arcs and direction emerge from signals.
          </p>
          <button
            type="button"
            onClick={() => {
              setOnboardingStep(7);
              setStepState(7);
              router.push('/home');
            }}
            className="px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return null;
}
