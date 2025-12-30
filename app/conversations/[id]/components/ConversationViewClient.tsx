// app/conversations/[id]/components/ConversationViewClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SelectableMessage from './SelectableMessage';
import { showError, showSuccess } from '@/app/components/ErrorNotification';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  index_in_conversation: number;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string | null;
  source: string;
  started_at: string;
  ended_at: string | null;
  parent_conversation_id: string | null;
  origin_highlight_id: string | null;
  created_at: string;
}

interface Highlight {
  id: string;
  message_id: string;
  content: string;
  start_offset: number | null;
  end_offset: number | null;
  label: string | null;
}

interface ConversationViewClientProps {
  conversation: Conversation;
  messages: Message[];
  highlights: Highlight[];
}

export default function ConversationViewClient({
  conversation,
  messages,
  highlights: initialHighlights,
}: ConversationViewClientProps) {
  const router = useRouter();
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return '';
    }
  };

  const handleHighlight = async (
    text: string,
    startOffset: number,
    endOffset: number,
    messageId: string
  ) => {
    try {
      const response = await fetch('/api/highlights/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.id,
          message_id: messageId,
          content: text,
          start_offset: startOffset,
          end_offset: endOffset,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to create highlight';
        showError(errorMessage);
        console.error('Failed to create highlight:', errorData.error);
        return;
      }

      const { highlight } = await response.json();
      setHighlights((prev) => [...prev, highlight]);
      showSuccess('Highlight created successfully');
      router.refresh();
    } catch (err) {
      console.error('Error creating highlight:', err);
    }
  };

  const handleRedact = async (
    text: string,
    startOffset: number,
    endOffset: number,
    messageId: string
  ) => {
    try {
      // Get project_id from conversation if available
      const response = await fetch('/api/redactions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversation.id,
          message_id: messageId,
          redacted_text: text,
          selection_start: startOffset,
          selection_end: endOffset,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to create redaction';
        showError(errorMessage);
        console.error('Failed to create redaction:', errorData.error);
        return;
      }

      showSuccess('Content redacted successfully');
      router.refresh();
    } catch (err) {
      console.error('Error creating redaction:', err);
    }
  };

  return (
    <div className="space-y-6">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-600 dark:text-zinc-400">
            No messages in this conversation.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {messages.map((message) => (
            <div
              key={message.id}
              className="group relative"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    message.role === 'user'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : message.role === 'assistant'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      : message.role === 'tool'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {message.role === 'user' ? 'U' : message.role === 'assistant' ? 'A' : message.role === 'tool' ? 'T' : 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-foreground">
                      {message.role === 'user' ? 'You' : message.role === 'assistant' ? 'AI' : message.role === 'tool' ? 'Tool' : 'System'}
                    </span>
                    {message.created_at && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">
                        {formatTimestamp(message.created_at)}
                      </span>
                    )}
                  </div>
                  <SelectableMessage
                    messageId={message.id}
                    content={message.content}
                    role={message.role}
                    conversationId={conversation.id}
                    onHighlight={(text, start, end) =>
                      handleHighlight(text, start, end, message.id)
                    }
                    onRedact={(text, start, end) =>
                      handleRedact(text, start, end, message.id)
                    }
                    existingHighlights={highlights
                      .filter((h) => h.message_id === message.id)
                      .map((h) => ({
                        id: h.id,
                        start_offset: h.start_offset,
                        end_offset: h.end_offset,
                        content: h.content,
                      }))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

