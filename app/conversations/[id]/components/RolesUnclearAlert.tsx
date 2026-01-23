// app/conversations/[id]/components/RolesUnclearAlert.tsx
'use client';

import { useState } from 'react';
import DefineRolesModal from './DefineRolesModal';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  index_in_conversation: number;
}

interface RolesUnclearAlertProps {
  conversationId: string;
  messages: Message[];
}

export default function RolesUnclearAlert({
  conversationId,
  messages,
}: RolesUnclearAlertProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-600 dark:text-amber-400">⚠️</span>
          <span className="text-amber-800 dark:text-amber-300">
            Roles look unclear —
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-amber-800 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 underline font-medium"
          >
            Review
          </button>
        </div>
      </div>

      {isModalOpen && (
        <DefineRolesModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          conversationId={conversationId}
          messages={messages}
          originalMessages={[...messages]}
        />
      )}
    </>
  );
}
