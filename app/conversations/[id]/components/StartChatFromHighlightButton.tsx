// app/conversations/[id]/components/StartChatFromHighlightButton.tsx
'use client';

import { useState } from 'react';
import StartChatModal from '@/app/components/StartChatModal';
import { generateContextFromHighlight } from '@/lib/contextGenerator';

interface StartChatFromHighlightButtonProps {
  highlight: {
    id: string;
    content: string;
    label?: string | null;
  };
  conversationTitle: string | null;
  projectName?: string | null;
}

export default function StartChatFromHighlightButton({
  highlight,
  conversationTitle,
  projectName,
}: StartChatFromHighlightButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const contextBlock = generateContextFromHighlight({
    highlightContent: highlight.content,
    highlightLabel: highlight.label,
    conversationTitle,
    projectName,
  });

  return (
    <>
      <button
        onClick={handleClick}
        className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
        title="Start chat from this highlight"
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

