// app/conversations/[id]/components/DefineRolesModal.tsx
// Modal for defining roles in role-ambiguous conversations

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  index_in_conversation: number;
}

interface DefineRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  messages: Message[];
  originalMessages: Message[]; // Store original for reset
}

export default function DefineRolesModal({
  isOpen,
  onClose,
  conversationId,
  messages: initialMessages,
  originalMessages,
}: DefineRolesModalProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset to original when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessages(originalMessages);
      setHasChanges(false);
    }
  }, [isOpen, originalMessages]);

  const toggleRole = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              role: msg.role === 'user' ? 'assistant' : 'user',
            }
          : msg
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/conversations/define-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          roleUpdates: messages.map((msg) => ({
            messageId: msg.id,
            role: msg.role,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save roles');
      }

      showSuccess('Roles updated successfully');
      router.refresh();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save roles');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMessages(originalMessages);
    setHasChanges(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, hasChanges]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div
        className="bg-[rgb(var(--surface))] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--ring)/0.12)]">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-1">
              Define Roles
            </h2>
            <p className="text-sm text-[rgb(var(--muted))]">
              Tag each block as Me or AI to improve Reduce accuracy
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-3 p-4 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:border-[rgb(var(--ring)/0.2)] transition-colors"
              >
                <button
                  onClick={() => toggleRole(message.id)}
                  className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    message.role === 'user'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                  } hover:opacity-80`}
                >
                  {message.role === 'user' ? 'Me' : 'AI'}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[rgb(var(--ring)/0.12)]">
          <button
            onClick={handleReset}
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors underline"
            disabled={!hasChanges}
          >
            Reset to original
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium text-[rgb(var(--text))]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Roles'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
