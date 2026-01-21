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
}

export default function DefineRolesButton({
  conversationId,
  messages,
  isRoleAmbiguous,
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
          className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors underline"
        >
          Define Roles
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Optional — label who said what to improve Reduce.
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
