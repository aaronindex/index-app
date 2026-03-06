'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface OtherDecision {
  id: string;
  title: string;
}

interface SupersedeDecisionButtonProps {
  decisionId: string;
  decisionTitle: string;
  /** Other decisions in the same project (excluding this one) to choose as the replacement. */
  otherDecisions: OtherDecision[];
}

export default function SupersedeDecisionButton({
  decisionId,
  decisionTitle,
  otherDecisions,
}: SupersedeDecisionButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSupersede = async () => {
    if (!selectedId) {
      showError('Choose a decision to supersede with');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/decisions/${decisionId}/supersede`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superseded_by_decision_id: selectedId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Failed to supersede decision';
        showError(msg);
        return;
      }

      showSuccess('Decision superseded');
      setOpen(false);
      setSelectedId('');
      router.refresh();
    } catch (err) {
      console.error('Supersede decision:', err);
      showError('Failed to supersede decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
        title="Supersede with another decision"
      >
        Supersede
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="supersede-title"
        >
          <div
            className="bg-[rgb(var(--surface))] rounded-xl max-w-md w-full p-5 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="supersede-title" className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-2">
              Supersede decision
            </h2>
            <p className="text-sm text-[rgb(var(--muted))] mb-4">
              Mark &quot;{decisionTitle}&quot; as superseded by another decision.
            </p>

            {otherDecisions.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted))] mb-4">
                No other decisions in this project. Create a replacement decision first, then supersede.
              </p>
            ) : (
              <div className="mb-4">
                <label htmlFor="supersede-select" className="block text-xs font-medium text-[rgb(var(--muted))] mb-1">
                  Supersede with
                </label>
                <select
                  id="supersede-select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full p-2 text-sm border border-[rgb(var(--ring)/0.2)] rounded-lg bg-[rgb(var(--bg))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                >
                  <option value="">Choose a decision</option>
                  {otherDecisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || 'Untitled'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSelectedId('');
                }}
                className="px-3 py-1.5 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSupersede}
                disabled={loading || otherDecisions.length === 0 || !selectedId}
                className="px-3 py-1.5 text-sm font-medium bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : 'Supersede'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
