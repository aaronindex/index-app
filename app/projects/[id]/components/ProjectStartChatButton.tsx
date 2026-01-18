// app/projects/[id]/components/ProjectStartChatButton.tsx
'use client';

import { useState } from 'react';
import StartChatModal from '@/app/components/StartChatModal';
// Intent descriptions - must match server-side
const INTENT_DESCRIPTIONS: Record<string, string> = {
  decide_between_options: 'Decide between options',
  generate_next_actions: 'Generate next concrete actions',
  resolve_blocking_uncertainty: 'Resolve a blocking uncertainty',
  produce_plan_architecture: 'Produce a plan / architecture',
  stress_test_direction: 'Stress-test current direction',
  summarize_state_propose_path: 'Summarize state → propose path forward',
};

type StartChatIntent = 
  | 'decide_between_options'
  | 'generate_next_actions'
  | 'resolve_blocking_uncertainty'
  | 'produce_plan_architecture'
  | 'stress_test_direction'
  | 'summarize_state_propose_path'
  | 'custom';

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
