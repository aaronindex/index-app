// app/conversations/[id]/components/DefineRolesModal.tsx
// Modal for defining roles in role-ambiguous conversations

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  index_in_conversation: number;
  isTemporary?: boolean; // For newly split messages
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
  const [selection, setSelection] = useState<{
    messageId: string;
    startOffset: number;
    endOffset: number;
    text: string;
  } | null>(null);
  const [splitButtonPosition, setSplitButtonPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tempIdCounter = useRef(0);

  // Reset to original when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessages(originalMessages);
      setHasChanges(false);
      setSelection(null);
      setSplitButtonPosition(null);
      tempIdCounter.current = 0;
    }
  }, [isOpen, originalMessages]);

  // Handle text selection
  useEffect(() => {
    if (!isOpen) return;

    const handleSelection = () => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
          setSelection(null);
          setSplitButtonPosition(null);
          return;
        }

        const range = sel.getRangeAt(0);
        const selectedText = sel.toString().trim();

        if (!selectedText) {
          setSelection(null);
          setSplitButtonPosition(null);
          return;
        }

        // Find which message block contains this selection
        for (const [messageId, element] of Object.entries(messageRefs.current)) {
          if (!element) continue;

          // Find the content paragraph within this message
          const contentElement = element.querySelector('p');
          if (!contentElement) continue;

          // Check if selection is entirely within this message's content
          // Use a more lenient check - if the common ancestor is within the message block
          const isWithinMessage = 
            element.contains(range.commonAncestorContainer) || 
            element === range.commonAncestorContainer ||
            contentElement.contains(range.commonAncestorContainer) ||
            contentElement === range.commonAncestorContainer;

          if (isWithinMessage) {
            // Verify selection is within content bounds
            const messageRange = document.createRange();
            try {
              messageRange.selectNodeContents(contentElement);
              
              const isWithinBounds = 
                range.compareBoundaryPoints(Range.START_TO_START, messageRange) >= 0 &&
                range.compareBoundaryPoints(Range.END_TO_END, messageRange) <= 0;

              if (isWithinBounds) {
                const message = messages.find((m) => m.id === messageId);
                if (!message) continue;

                // Calculate offsets within the message content
                const beforeRange = document.createRange();
                beforeRange.setStart(contentElement, 0);
                beforeRange.setEnd(range.startContainer, range.startOffset);
                const startOffset = beforeRange.toString().length;

                const afterRange = document.createRange();
                afterRange.setStart(contentElement, 0);
                afterRange.setEnd(range.endContainer, range.endOffset);
                const endOffset = afterRange.toString().length;

                // Position split button near selection (use fixed positioning relative to viewport)
                const rect = range.getBoundingClientRect();
                setSplitButtonPosition({
                  top: rect.top + window.scrollY - 50, // Position above selection
                  left: rect.left + window.scrollX + rect.width / 2,
                });

                setSelection({
                  messageId,
                  startOffset,
                  endOffset,
                  text: selectedText,
                });
                return;
              }
            } catch (e) {
              // Range error - continue to next message
              continue;
            }
          }
        }

        // Selection spans multiple blocks - clear it
        setSelection(null);
        setSplitButtonPosition(null);
      }, 10);
    };

    const handleMouseUp = () => {
      // Also check selection on mouseup as backup
      handleSelection();
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, messages]);

  // Auto-assign alternating roles
  const applyAlternatingRoles = (msgs: Message[]): Message[] => {
    if (msgs.length === 0) return msgs;

    // Determine starting role from first message (or default to user)
    const startRole = msgs[0].role === 'assistant' ? 'assistant' : 'user';
    
    return msgs.map((msg, index) => {
      const expectedRole = index % 2 === 0 ? startRole : (startRole === 'user' ? 'assistant' : 'user');
      return {
        ...msg,
        role: expectedRole,
      };
    });
  };

  // Split a message block
  const handleSplit = () => {
    if (!selection) return;

    const messageIndex = messages.findIndex((m) => m.id === selection.messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    // Preserve exact text content - only skip blocks that are empty after trimming
    const beforeTextRaw = message.content.slice(0, selection.startOffset);
    const selectedTextRaw = message.content.slice(selection.startOffset, selection.endOffset);
    const afterTextRaw = message.content.slice(selection.endOffset);
    
    // Use original text if not empty (after trim check), empty string if empty
    const beforeText = beforeTextRaw.trim() ? beforeTextRaw : '';
    const selectedText = selectedTextRaw.trim() ? selectedTextRaw : '';
    const afterText = afterTextRaw.trim() ? afterTextRaw : '';

    // Create new messages array
    const newMessages: Message[] = [];

    // Before text block (keep original ID if it's the first part)
    if (beforeText) {
      newMessages.push({
        ...message,
        id: message.id, // Keep original ID for first part
        content: beforeText,
        index_in_conversation: message.index_in_conversation,
      });
    }

    // Selected text block
    if (selectedText) {
      // If no beforeText, use original ID for selected text
      if (!beforeText) {
        newMessages.push({
          ...message,
          id: message.id,
          content: selectedText,
          index_in_conversation: message.index_in_conversation,
        });
      } else {
        tempIdCounter.current++;
        newMessages.push({
          id: `temp-${tempIdCounter.current}`,
          role: message.role,
          content: selectedText,
          index_in_conversation: message.index_in_conversation + newMessages.length,
          isTemporary: true,
        });
      }
    }

    // After text block
    if (afterText) {
      tempIdCounter.current++;
      newMessages.push({
        id: `temp-${tempIdCounter.current}`,
        role: message.role,
        content: afterText,
        index_in_conversation: message.index_in_conversation + newMessages.length,
        isTemporary: true,
      });
    }

    // Rebuild messages array
    const updatedMessages = [
      ...messages.slice(0, messageIndex),
      ...newMessages,
      ...messages.slice(messageIndex + 1),
    ];

    // Re-index all messages
    const reindexed = updatedMessages.map((msg, idx) => ({
      ...msg,
      index_in_conversation: idx,
    }));

    // Apply alternating roles from the split point
    const withAlternatingRoles = applyAlternatingRoles(reindexed);

    setMessages(withAlternatingRoles);
    setHasChanges(true);
    setSelection(null);
    setSplitButtonPosition(null);

    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  // Toggle role with downstream propagation
  const toggleRole = (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    const newRole = message.role === 'user' ? 'assistant' : 'user';

    // Flip this message and all downstream messages
    setMessages((prev) => {
      return prev.map((msg, idx) => {
        if (idx >= messageIndex) {
          // Flip role for this and all downstream
          return {
            ...msg,
            role: msg.role === 'user' ? 'assistant' : 'user',
          };
        }
        return msg;
      });
    });

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
          messages: messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            index_in_conversation: msg.index_in_conversation,
            isTemporary: msg.isTemporary,
          })),
          originalMessageIds: originalMessages.map((m) => m.id),
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
        <div className="flex-1 overflow-y-auto p-6 relative" id="define-roles-content">
          {/* Split button - floating action */}
          {selection && splitButtonPosition && (
            <button
              onClick={handleSplit}
              className="fixed z-50 px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] text-sm font-medium rounded-lg shadow-xl hover:opacity-90 transition-opacity border-2 border-[rgb(var(--bg))]"
              style={{
                top: `${Math.max(10, splitButtonPosition.top)}px`,
                left: `${splitButtonPosition.left}px`,
                transform: 'translateX(-50%)',
              }}
              onMouseDown={(e) => e.preventDefault()} // Prevent selection from clearing
            >
              Split
            </button>
          )}
          
          {/* Debug: Show selection info (temporary) */}
          {selection && (
            <div className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-blue-500 text-white text-xs rounded shadow-lg">
              Selection detected: {selection.text.substring(0, 20)}...
            </div>
          )}

          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                ref={(el) => {
                  messageRefs.current[message.id] = el;
                }}
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
                  <p className="text-sm text-[rgb(var(--text))] whitespace-pre-wrap break-words select-text">
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
