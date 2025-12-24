// app/projects/[id]/components/GenerateThemesButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GenerateThemesButtonProps {
  projectId: string;
  conversationIds: string[];
}

export default function GenerateThemesButton({ projectId, conversationIds }: GenerateThemesButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    if (conversationIds.length < 2) {
      setError('Need at least 2 conversations to generate themes');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/themes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationIds,
          minClusterSize: 2,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate themes');
      }

      const data = await response.json();
      
      if (data.success && data.themes && data.themes.length > 0) {
        setSuccess(true);
        // Dispatch custom event to refresh themes component
        window.dispatchEvent(new CustomEvent('themeGenerated'));
        router.refresh(); // Refresh to show new themes
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Show detailed error message
        const errorMsg = data.message || 'No themes were generated. Try with more conversations or conversations with more similar content.';
        setError(errorMsg);
        console.error('Theme generation failed:', data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate themes');
    } finally {
      setLoading(false);
    }
  };

  if (conversationIds.length < 2) {
    return (
      <button
        disabled
        className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg opacity-50 cursor-not-allowed text-zinc-500 dark:text-zinc-400"
        title="Need at least 2 conversations to generate themes"
      >
        Generate Themes
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating...' : success ? '✓ Themes Generated' : 'Generate Themes'}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-400 whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
}

