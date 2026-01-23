// app/projects/[id]/components/ProjectStartChatButton.tsx
'use client';

import { useState } from 'react';
import StartChatModal from '@/app/components/StartChatModal';

interface ProjectStartChatButtonProps {
  projectId: string;
  projectName?: string;
}

export default function ProjectStartChatButton({ projectId, projectName }: ProjectStartChatButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full sm:w-auto px-4 py-2 text-sm font-medium bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity"
      >
        Resume
      </button>
      <StartChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contextBlock={{
          project: projectName || undefined,
          source: 'decision',
          summary: 'Resume',
          suggestedExploration: '',
          fullContext: '',
        }}
        runId={null}
        onStatusUpdate={undefined}
        mode="intent-selector"
        onGenerate={async (intent: string, targetTool: string) => {
          try {
            const response = await fetch('/api/start-chat/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                originType: 'project',
                originId: projectId,
                intent,
                targetTool,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to generate prompt');
            }

            const data = await response.json();
            // Return prompt data to modal - modal will handle state internally
            return {
              promptText: data.promptText,
              runId: data.runId,
            };
          } catch (err) {
            console.error('Failed to generate prompt:', err);
            throw err;
          }
        }}
        projectName={projectName}
      />
    </>
  );
}
