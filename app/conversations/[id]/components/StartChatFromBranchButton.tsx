// app/conversations/[id]/components/StartChatFromBranchButton.tsx
'use client';

import { useState } from 'react';
import StartChatModal from '@/app/components/StartChatModal';
import { generateContextFromBranch } from '@/lib/contextGenerator';

interface StartChatFromBranchButtonProps {
  branchTitle: string | null;
  branchHighlights: Array<{ content: string; label?: string | null }>;
  parentConversationTitle: string | null;
  projectName?: string | null;
}

export default function StartChatFromBranchButton({
  branchTitle,
  branchHighlights,
  parentConversationTitle,
  projectName,
}: StartChatFromBranchButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const contextBlock = generateContextFromBranch({
    branchTitle,
    branchHighlights,
    parentConversationTitle,
    projectName,
  });

  return (
    <>
      <button
        onClick={handleClick}
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
        title="Start chat from this branch"
      >
        Start Chat →
      </button>
      <StartChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contextBlock={contextBlock}
      />
    </>
  );
}

