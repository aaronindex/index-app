'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface InvalidateDecisionButtonProps {
  decisionId: string;
}

export default function InvalidateDecisionButton({ decisionId }: InvalidateDecisionButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInvalidate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/decisions/${decisionId}/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg = typeof data.error === 'string' ? data.error : 'Failed to invalidate decision';
        showError(msg);
        return;
      }

      showSuccess('Decision invalidated');
      router.refresh();
    } catch (err) {
      console.error('Invalidate decision:', err);
      showError('Failed to invalidate decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInvalidate}
      disabled={loading}
      className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors disabled:opacity-50"
      title="Invalidate decision"
    >
      {loading ? '...' : 'Invalidate'}
    </button>
  );
}
