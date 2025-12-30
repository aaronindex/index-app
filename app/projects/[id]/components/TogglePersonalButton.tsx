// app/projects/[id]/components/TogglePersonalButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface TogglePersonalButtonProps {
  projectId: string;
  isPersonal: boolean;
}

export default function TogglePersonalButton({ projectId, isPersonal }: TogglePersonalButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/toggle-personal`, { method: 'POST' });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to update project';
        showError(errorMessage);
        console.error('Failed to toggle personal:', error);
        return;
      }

      showSuccess(isPersonal ? 'Project marked as business' : 'Project marked as personal');
      router.refresh();
    } catch (error) {
      console.error('Error toggling personal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors disabled:opacity-50"
      title={isPersonal ? 'Mark as business project' : 'Mark as personal project'}
    >
      {loading ? '...' : isPersonal ? 'Mark Business' : 'Mark Personal'}
    </button>
  );
}

