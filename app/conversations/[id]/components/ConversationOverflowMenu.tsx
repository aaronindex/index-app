// app/conversations/[id]/components/ConversationOverflowMenu.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DefineRolesModal from './DefineRolesModal';
import { isRoleAmbiguous } from '@/lib/conversations/roleAmbiguity';

// DeleteConversationButton as menu item component
function DeleteConversationMenuItem({
  conversationId,
  conversationTitle,
  projectId,
  onDelete,
}: {
  conversationId: string;
  conversationTitle: string | null;
  projectId: string | null;
  onDelete: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete conversation');
        setLoading(false);
        return;
      }

      // Success - redirect
      if (projectId) {
        router.push(`/projects/${projectId}`);
      } else {
        router.push('/unassigned');
      }
      router.refresh();
      onDelete();
    } catch (err) {
      setError('Failed to delete conversation');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowConfirm(true);
          }
        }}
        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/20"
      >
        Delete conversation
      </button>
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Delete Conversation</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            <p className="text-zinc-700 dark:text-zinc-300 mb-6">
              Are you sure you want to delete "{conversationTitle || 'this conversation'}"?
              <br />
              <span className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 block">
                This will permanently delete all messages, highlights, and related data. This action cannot be undone.
              </span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  index_in_conversation: number;
}

interface ConversationOverflowMenuProps {
  conversationId: string;
  conversationTitle: string | null;
  messages: Message[];
  projectId: string | null;
  onDefineRolesClick?: () => void;
}

export default function ConversationOverflowMenu({
  conversationId,
  conversationTitle,
  messages,
  projectId,
  onDefineRolesClick,
}: ConversationOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDefineRoles, setShowDefineRoles] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleDefineRoles = () => {
    setIsOpen(false);
    setShowDefineRoles(true);
    if (onDefineRolesClick) {
      onDefineRolesClick();
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className="w-9 h-9 rounded-lg ring-1 ring-[rgb(var(--ring)/0.12)] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface2))] flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
          aria-label="More options"
          aria-expanded={isOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-[rgb(var(--text))]"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.12)] rounded-lg shadow-lg z-50">
            <div className="py-1">
              {messages.length > 0 && isRoleAmbiguous(messages) && (
                <button
                  onClick={handleDefineRoles}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDefineRoles();
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))] transition-colors focus:outline-none focus:bg-[rgb(var(--surface2))]"
                >
                  Define roles
                </button>
              )}
              <DeleteConversationMenuItem
                conversationId={conversationId}
                conversationTitle={conversationTitle}
                projectId={projectId}
                onDelete={() => setIsOpen(false)}
              />
            </div>
          </div>
        )}
      </div>

      {showDefineRoles && (
        <DefineRolesModal
          isOpen={showDefineRoles}
          onClose={() => setShowDefineRoles(false)}
          conversationId={conversationId}
          messages={messages}
          originalMessages={[...messages]}
        />
      )}
    </>
  );
}
