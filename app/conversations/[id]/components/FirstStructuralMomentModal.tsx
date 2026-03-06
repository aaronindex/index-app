'use client';

interface FirstStructuralMomentModalProps {
  counts: { decisions: number; openLoops: number; suggestedHighlights: number } | null;
  onContinue: () => void;
  /** When set, show "View signals" and "Import another source" instead of Continue (onboarding step 4). */
  onboardingStep4?: {
    projectId: string;
    onViewSignals: () => void;
    onImportAnother: () => void;
  };
}

export default function FirstStructuralMomentModal({
  counts,
  onContinue,
  onboardingStep4,
}: FirstStructuralMomentModalProps) {
  const hasCounts =
    counts &&
    (counts.decisions > 0 || counts.openLoops > 0 || counts.suggestedHighlights > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity duration-150"
      role="dialog"
      aria-labelledby="first-structural-title"
      aria-modal="true"
    >
      <div
        className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-6 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)] transition-opacity duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="first-structural-title"
          className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4"
        >
          Signals extracted
        </h2>

        {hasCounts && counts && (
          <p className="text-sm text-[rgb(var(--text))] mb-4 whitespace-pre-wrap">
            {counts.decisions} decision{counts.decisions !== 1 ? 's' : ''}
            {'\n'}
            {counts.openLoops} task{counts.openLoops !== 1 ? 's' : ''}
            {'\n'}
            {counts.suggestedHighlights} highlight{counts.suggestedHighlights !== 1 ? 's' : ''}
          </p>
        )}

        <p className="text-sm text-[rgb(var(--muted))] mb-6">
          {onboardingStep4 ? 'Signals accumulate into structure.' : 'These signals accumulate over time.\nDirection becomes visible as decisions form.'}
        </p>

        {onboardingStep4 ? (
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <button
              type="button"
              onClick={onboardingStep4.onImportAnother}
              className="px-4 py-2 text-sm font-medium border border-[rgb(var(--ring)/0.3)] text-[rgb(var(--text))] rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
            >
              Import another source
            </button>
            <button
              type="button"
              onClick={onboardingStep4.onViewSignals}
              className="px-4 py-2 text-sm font-medium bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
            >
              View signals
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onContinue}
              className="px-4 py-2 text-sm font-medium bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
