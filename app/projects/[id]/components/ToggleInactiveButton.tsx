// app/projects/[id]/components/ToggleInactiveButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface ToggleInactiveButtonProps {
  type: 'conversation' | 'task' | 'decision' | 'asset';
  id: string;
  isInactive: boolean;
  onToggle?: () => void;
}

export default function ToggleInactiveButton({ type, id, isInactive, onToggle }: ToggleInactiveButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    try {
      let endpoint: string;
      let method: string;
      let body: any;

      if (type === 'asset') {
        endpoint = `/api/assets/${id}/toggle-inactive`;
        method = 'PATCH';
        body = JSON.stringify({ is_inactive: !isInactive });
      } else {
        endpoint = `/api/${type}s/${id}/toggle-inactive`;
        method = 'POST';
        body = undefined;
      }

      const response = await fetch(endpoint, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to update item';
        showError(errorMessage);
        console.error('Failed to toggle inactive:', error);
        return;
      }

      showSuccess(isInactive ? 'Item marked as active' : 'Item marked as inactive');
      
      if (onToggle) {
        onToggle();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('Error toggling inactive:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors disabled:opacity-50"
      title={isInactive ? 'Mark as active' : 'Mark as inactive'}
    >
      {loading ? '...' : isInactive ? 'Mark active' : 'Mark inactive'}
    </button>
  );
}

