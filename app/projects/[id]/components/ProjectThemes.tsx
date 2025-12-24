// app/projects/[id]/components/ProjectThemes.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Theme {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  conversationCount: number;
}

interface ProjectThemesProps {
  projectId: string;
}

export default function ProjectThemes({ projectId }: ProjectThemesProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThemes() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/themes`);
        if (!response.ok) {
          throw new Error('Failed to fetch themes');
        }
        const result = await response.json();
        if (result.success) {
          setThemes(result.themes || []);
        } else {
          setError(result.error || 'Failed to load themes');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchThemes();
    
    // Listen for custom event to refresh themes
    const handleThemeGenerated = () => {
      fetchThemes();
    };
    window.addEventListener('themeGenerated', handleThemeGenerated);
    return () => window.removeEventListener('themeGenerated', handleThemeGenerated);
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading themes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
        <h3 className="font-medium text-foreground mb-2">Themes</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No themes generated yet. Click "Generate Themes" in the project header to cluster conversations into themes.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
      <h3 className="font-medium text-foreground mb-4">Themes</h3>
      <div className="space-y-3">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{theme.name}</p>
                {theme.description && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                    {theme.description}
                  </p>
                )}
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-500 ml-2">
                {theme.conversationCount} conversation{theme.conversationCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

