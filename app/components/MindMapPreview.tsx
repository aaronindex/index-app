// app/components/MindMapPreview.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Theme {
  id: string;
  name: string;
  description: string;
  weight: number;
  conversationCount: number;
}

interface Tag {
  name: string;
  category: string;
  count: number;
}

interface MindMapData {
  themes: Theme[];
  topTags: Tag[];
}

export default function MindMapPreview() {
  const [data, setData] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/themes/week');
        if (!response.ok) {
          throw new Error('Failed to fetch mind map data');
        }
        const result = await response.json();
        if (result.success) {
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching mind map:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading mind map...</p>
      </div>
    );
  }

  if (!data || (data.themes.length === 0 && data.topTags.length === 0)) {
    return (
      <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
        <h3 className="font-medium text-foreground mb-2">Your Mind Map This Week</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No themes or tags yet. Import conversations to see your mind map take shape.
        </p>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      entity: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      topic: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
      person: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      project: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
      technology: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-400',
      concept: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    };
    return colors[category] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
  };

  // Themes and tags hidden from UI - kept as internal signal layer only
  return null;
}

