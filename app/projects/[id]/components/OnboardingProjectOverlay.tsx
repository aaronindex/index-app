'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getTunnelStep, getTunnelDistillCount } from '@/lib/onboarding/state';

const TUNNEL_UPDATE = 'index_tunnel_update';

/** Dispatch when tunnel state (e.g. distill count) changes so overlay re-renders. */
export function dispatchTunnelUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TUNNEL_UPDATE));
  }
}

export default function OnboardingProjectOverlay() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = typeof params?.id === 'string' ? params.id : null;
  const tab = searchParams.get('tab') || 'read';
  const activeTab = tab === 'signals' ? 'signals' : tab === 'chats' ? 'chats' : 'read';

  const [step, setStep] = useState<ReturnType<typeof getTunnelStep>>(null);
  const [distillCount, setDistillCount] = useState(0);
  const [step3Dismissed, setStep3Dismissed] = useState(false);

  const update = () => {
    setStep(getTunnelStep());
    setDistillCount(getTunnelDistillCount());
  };

  useEffect(() => {
    update();
    window.addEventListener(TUNNEL_UPDATE, update);
    return () => window.removeEventListener(TUNNEL_UPDATE, update);
  }, []);

  const showStep3Modal = step === 3 && activeTab === 'chats' && projectId && distillCount === 0 && !step3Dismissed;
  const showStep3Confirmation = step === 3 && activeTab === 'chats' && projectId && distillCount === 1;

  if (!projectId) return null;

  if (showStep3Modal) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tunnel-step3-heading"
      >
        <div className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-8 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]">
          <h2
            id="tunnel-step3-heading"
            className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4"
          >
            Extract signals from your sources
          </h2>
          <p className="text-sm text-[rgb(var(--text))] mb-3">
            Distill each source to extract decisions, tasks, and structural signals.
          </p>
          <p className="text-sm text-[rgb(var(--muted))] mb-6 font-medium">
            Start with the first source.
          </p>
          <p className="text-xs text-[rgb(var(--muted))] mb-6">
            Use the <strong className="text-[rgb(var(--text))]">Distill signals</strong> button on each source.
          </p>
          <button
            type="button"
            onClick={() => setStep3Dismissed(true)}
            className="w-full px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  if (showStep3Confirmation) {
    return (
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl bg-[rgb(var(--surface))] shadow-lg ring-1 ring-[rgb(var(--ring)/0.12)]"
        role="status"
      >
        <p className="text-sm font-medium text-[rgb(var(--text))]">
          Signals extracted.
        </p>
        <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
          Distill the remaining source.
        </p>
      </div>
    );
  }

  return null;
}
