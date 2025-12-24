// app/conversations/[id]/components/CreateBranchButton.tsx
'use client';

import { useState } from 'react';
import CreateBranchModal from './CreateBranchModal';

interface Highlight {
  id: string;
  content: string;
  label: string | null;
}

interface CreateBranchButtonProps {
  conversationId: string;
  highlights: Highlight[];
}

export default function CreateBranchButton({
  conversationId,
  highlights,
}: CreateBranchButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="mt-4 w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
      >
        + Create Branch
      </button>
      <CreateBranchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        conversationId={conversationId}
        highlights={highlights}
      />
    </>
  );
}

