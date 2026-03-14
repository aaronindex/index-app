'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOnboardingState,
  getTunnelStep,
  setTunnelStep,
  getOnboardingProjectId,
  markOnboardingCompleted,
} from '@/lib/onboarding/state';

const TUNNEL_UPDATE = 'index_tunnel_update';

/** Step 1 — Explain INDEX. Shown right after account creation. */
function Step1Modal({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tunnel-step1-heading"
    >
      <div className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]">
        <h2
          id="tunnel-step1-heading"
          className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4"
        >
          INDEX reveals the structure of your thinking
        </h2>
        <p className="text-sm text-[rgb(var(--text))] mb-3">
          Import conversations, notes, or transcripts. INDEX extracts signals — decisions, tasks, and shifts — and reveals patterns across them.
        </p>
        <p className="text-sm text-[rgb(var(--muted))] mb-6">
          INDEX improves as it learns from more of your thinking. Start by importing two sources.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="w-full px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          Start importing
        </button>
      </div>
    </div>
  );
}

/** Step 4 — Structure reveal. Buttons: View Project Read (primary), Across Your INDEX. */
function Step4Modal({
  projectId,
  onViewProjectRead,
  onAcrossIndex,
}: {
  projectId: string | null;
  onViewProjectRead: () => void;
  onAcrossIndex: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tunnel-step4-heading"
    >
      <div className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]">
        <h2
          id="tunnel-step4-heading"
          className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4"
        >
          Structure is beginning to emerge
        </h2>
        <p className="text-sm text-[rgb(var(--text))] mb-3">
          INDEX has identified signals across your sources. View your project to see the emerging structure.
        </p>
        <p className="text-sm text-[rgb(var(--muted))] mb-6">
          INDEX improves as it learns from more of your thinking.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {projectId && (
            <button
              type="button"
              onClick={onViewProjectRead}
              className="flex-1 px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              View Project Read
            </button>
          )}
          <button
            type="button"
            onClick={onAcrossIndex}
            className={projectId ? 'flex-1 px-6 py-3 border border-[rgb(var(--ring)/0.3)] text-[rgb(var(--text))] rounded-lg hover:opacity-90 transition-opacity font-medium' : 'w-full px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium'}
          >
            Across Your INDEX
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TunnelOnboarding() {
  const router = useRouter();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [step, setStep] = useState<ReturnType<typeof getTunnelStep>>(null);

  useEffect(() => {
    let cancelled = false;
    getOnboardingState().then((state) => {
      if (!cancelled) setCompleted(state.completed);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const update = () => setStep(getTunnelStep());
    update();
    window.addEventListener(TUNNEL_UPDATE, update);
    return () => window.removeEventListener(TUNNEL_UPDATE, update);
  }, [completed]);

  const showStep1 = completed === false && (step === null || step === 1);
  const showStep4 = completed === false && step === 4;

  const handleStartImporting = () => {
    setTunnelStep(2);
    setStep(2);
    router.push('/import');
  };

  const handleViewProjectRead = async () => {
    const projectId = getOnboardingProjectId();
    await markOnboardingCompleted();
    setCompleted(true);
    setStep(null);
    if (projectId) router.push(`/projects/${projectId}?tab=read`);
    else router.push('/home');
  };

  const handleAcrossIndex = async () => {
    await markOnboardingCompleted();
    setCompleted(true);
    setStep(null);
    router.push('/home');
  };

  if (completed !== false) return null;

  if (showStep1) {
    return <Step1Modal onStart={handleStartImporting} />;
  }

  if (showStep4) {
    return (
      <Step4Modal
        projectId={getOnboardingProjectId()}
        onViewProjectRead={handleViewProjectRead}
        onAcrossIndex={handleAcrossIndex}
      />
    );
  }

  return null;
}
