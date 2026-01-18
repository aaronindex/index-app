// app/projects/[id]/components/ExportChecklistButton.tsx
'use client';

import { useState } from 'react';

interface ExportChecklistButtonProps {
  projectId: string;
}

export default function ExportChecklistButton({ projectId }: ExportChecklistButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/export-checklist`);
      
      if (!response.ok) {
        throw new Error('Failed to export checklist');
      }

      // Get the markdown content
      const markdown = await response.text();
      
      // Create a blob and download it
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'checklist.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export checklist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="w-full sm:w-auto px-4 py-2 text-sm font-medium border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors text-[rgb(var(--text))] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Exporting...' : 'Export checklist'}
    </button>
  );
}

