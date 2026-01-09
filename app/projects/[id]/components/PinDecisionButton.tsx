// app/projects/[id]/components/PinDecisionButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

interface PinDecisionButtonProps {
  decisionId: string;
  isPinned: boolean;
  projectId: string;
}

export default function PinDecisionButton({ decisionId, isPinned, projectId }: PinDecisionButtonProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);

  const handleToggle = async () => {
    if (updating) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/decisions/pin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, pinned: !isPinned }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to pin decision');
      }

      // Track analytics
      trackEvent('decision_pinned', {
        decision_id: decisionId,
        project_id: projectId,
        pinned: !isPinned,
      });

      router.refresh();
    } catch (err) {
      console.error('Failed to pin decision:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={updating}
      className="p-1.5 rounded hover:bg-[rgb(var(--surface2))] transition-colors disabled:opacity-50"
      title={isPinned ? 'Unpin decision' : 'Pin decision'}
    >
      {isPinned ? (
        <span className="text-lg">📌</span>
      ) : (
        <span className="text-lg opacity-40">📌</span>
      )}
    </button>
  );
}

