// app/conversations/[id]/components/SelectableMessage.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface SelectableMessageProps {
  messageId: string;
  content: string;
  role: string;
  conversationId: string;
  onHighlight: (text: string, startOffset: number, endOffset: number) => void;
  onRedact?: (text: string, startOffset: number, endOffset: number) => void;
  existingHighlights?: Array<{
    id: string;
    start_offset: number | null;
    end_offset: number | null;
    content: string;
  }>;
}

export default function SelectableMessage({
  messageId,
  content,
  role,
  conversationId,
  onHighlight,
  onRedact,
  existingHighlights = [],
}: SelectableMessageProps) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showHighlightButton, setShowHighlightButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          setShowHighlightButton(false);
          return;
        }

        const text = selection.toString().trim();
        if (!text || text.length === 0) {
          setShowHighlightButton(false);
          return;
        }

        const range = selection.getRangeAt(0);
        
        // Check if selection is within this message's content area
        if (!contentRef.current) {
          setShowHighlightButton(false);
          return;
        }

        const isWithinMessage = contentRef.current.contains(range.commonAncestorContainer);
        if (!isWithinMessage) {
          setShowHighlightButton(false);
          return;
        }

        // Get the plain text content from the DOM
        const domText = contentRef.current.textContent || '';
        
        // Calculate offsets by finding the selection in the DOM text
        // Clone the range and set start to beginning of content
        let startOffset = 0;
        let endOffset = 0;
        
        try {
          const rangeClone = range.cloneRange();
          rangeClone.setStart(contentRef.current, 0);
          rangeClone.setEnd(range.startContainer, range.startOffset);
          startOffset = rangeClone.toString().length;
          endOffset = startOffset + text.length;
        } catch (e) {
          // If range manipulation fails, try fallback
          const originalText = content;
          const startIndex = originalText.indexOf(text);
          if (startIndex >= 0) {
            startOffset = startIndex;
            endOffset = startIndex + text.length;
          } else {
            setShowHighlightButton(false);
            return;
          }
        }

        // Validate that offsets are reasonable
        if (startOffset >= 0 && endOffset <= domText.length && startOffset < endOffset) {
          setSelectedText(text);
          setSelectionRange({ start: startOffset, end: endOffset });
          
          // Position button near selection (fixed positioning uses viewport coordinates)
          const rect = range.getBoundingClientRect();
          setButtonPosition({
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2,
          });
          setShowHighlightButton(true);
        } else {
          setShowHighlightButton(false);
        }
      }, 50);
    };

    // Also handle mouseup as a backup trigger
    const handleMouseUp = () => {
      handleSelectionChange();
    };

    // Listen to selection changes on the document
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Also listen to mouseup on the content element
    const element = contentRef.current;
    if (element) {
      element.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (element) {
        element.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [content]);

  const handleHighlight = () => {
    if (selectedText && selectionRange) {
      onHighlight(selectedText, selectionRange.start, selectionRange.end);
      setShowHighlightButton(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleRedact = () => {
    if (selectedText && selectionRange && onRedact) {
      onRedact(selectedText, selectionRange.start, selectionRange.end);
      setShowHighlightButton(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  // Apply highlight styles to content
  const renderContentWithHighlights = () => {
    if (existingHighlights.length === 0) {
      return content;
    }

    // Sort highlights by start offset
    const sortedHighlights = [...existingHighlights].sort((a, b) => {
      const aStart = a.start_offset ?? 0;
      const bStart = b.start_offset ?? 0;
      return aStart - bStart;
    });

    let result: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedHighlights.forEach((highlight, idx) => {
      const start = highlight.start_offset ?? 0;
      const end = highlight.end_offset ?? content.length;

      // Add text before highlight
      if (start > lastIndex) {
        result.push(
          <span key={`text-${idx}`}>{content.slice(lastIndex, start)}</span>
        );
      }

      // Add highlighted text
      result.push(
        <mark
          key={`highlight-${highlight.id}`}
          className="bg-yellow-300 dark:bg-yellow-500/60 px-0.5 rounded text-zinc-900 dark:text-zinc-900"
          title={highlight.content}
        >
          {content.slice(start, end)}
        </mark>
      );

      lastIndex = end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      result.push(<span key="text-end">{content.slice(lastIndex)}</span>);
    }

    return result;
  };

  // Hide button when clicking outside
  useEffect(() => {
    if (!showHighlightButton) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't hide if clicking the button container or any button inside it
      const highlightButtonContainer = target.closest('[data-highlight-button]');
      if (highlightButtonContainer) {
        // Allow the button's onClick to fire - don't hide
        return;
      }
      // Hide if clicking outside the content area
      if (contentRef.current && !contentRef.current.contains(target)) {
        setShowHighlightButton(false);
        window.getSelection()?.removeAllRanges();
      }
    };

    // Use setTimeout to ensure button onClick fires first (bubbling phase)
    // This allows the button's onClick handler to execute before we check if we should hide
    const handleClick = (e: MouseEvent) => {
      setTimeout(() => {
        handleClickOutside(e);
      }, 0);
    };

    document.addEventListener('click', handleClick); // Use bubbling phase (default)
    return () => document.removeEventListener('click', handleClick);
  }, [showHighlightButton]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed select-text"
      >
        {renderContentWithHighlights()}
      </div>

      {showHighlightButton && (
        <div
          data-highlight-button
          className="fixed z-50 flex gap-2"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent event from bubbling to document
              handleHighlight();
            }}
            className="px-3 py-1.5 text-xs font-medium bg-foreground text-background rounded-lg shadow-lg hover:opacity-90 transition-opacity"
          >
            Highlight
          </button>
          {onRedact && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                handleRedact();
              }}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg shadow-lg hover:opacity-90 transition-opacity"
            >
              Redact
            </button>
          )}
        </div>
      )}
    </div>
  );
}

