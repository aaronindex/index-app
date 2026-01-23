// app/conversations/[id]/components/DefineRolesButton.tsx
// Button to open Define Roles modal for role-ambiguous conversations

'use client';

import { useState } from 'react';
import DefineRolesModal from './DefineRolesModal';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  index_in_conversation: number;
}

interface DefineRolesButtonProps {
  conversationId: string;
  messages: Message[];
  isRoleAmbiguous: boolean;
  rolesConfidenceLow?: boolean;
}

export default function DefineRolesButton({
  conversationId,
  messages,
  isRoleAmbiguous,
  rolesConfidenceLow = false,
}: DefineRolesButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isRoleAmbiguous) {
    return null;
  }

  return (
    <>
      <div className="relative group">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-[rgb(var(--text))] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
        >
          Define Roles
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Fix speaker roles by splitting and labeling blocks.
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-100"></div>
        </div>
      </div>
      <DefineRolesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        conversationId={conversationId}
        messages={messages}
        originalMessages={[...messages]} // Deep copy for reset functionality
      />
    </>
  );
}
