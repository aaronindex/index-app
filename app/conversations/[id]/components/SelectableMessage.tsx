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
  const [storedRange, setStoredRange] = useState<Range | null>(null);
  const [showHighlightButton, setShowHighlightButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [isIOS, setIsIOS] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Detect iOS Safari
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const platform = navigator.platform || '';
    
    // Check for iOS devices
    const isIOSDevice = 
      /iPad|iPhone|iPod/.test(userAgent) ||
      (platform === 'MacIntel' && navigator.maxTouchPoints > 1) || // iPad on iOS 13+
      /iPhone|iPad|iPod/.test(platform);
    
    setIsIOS(isIOSDevice);
  }, []);

  // Helper to check if a node is within an input/textarea
  const isInputOrTextarea = (node: Node | null): boolean => {
    if (!node) return false;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    if (!element) return false;
    const tagName = element.tagName?.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || element.closest('input, textarea') !== null;
  };

  // Helper to check if selection is within allowed content container
  const isSelectionWithinContent = (selection: Selection, range: Range): boolean => {
    if (!contentRef.current) return false;
    
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    
    if (!anchorNode || !focusNode) return false;
    
    // Check if both nodes are within our content container
    const anchorInContent = contentRef.current.contains(anchorNode);
    const focusInContent = contentRef.current.contains(focusNode);
    
    if (!anchorInContent || !focusInContent) return false;
    
    // Check if selection is within the range's common ancestor
    const isWithinMessage = contentRef.current.contains(range.commonAncestorContainer);
    return isWithinMessage;
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      // Small delay to ensure selection is complete (especially on mobile)
      setTimeout(() => {
        const selection = window.getSelection();
        
        // Hide if no selection or collapsed
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          setShowHighlightButton(false);
          setStoredRange(null);
          return;
        }

        const text = selection.toString().trim();
        if (!text || text.length === 0) {
          setShowHighlightButton(false);
          setStoredRange(null);
          return;
        }

        const range = selection.getRangeAt(0);
        
        // Ignore selections inside inputs/textareas
        if (isInputOrTextarea(range.startContainer) || isInputOrTextarea(range.endContainer)) {
          setShowHighlightButton(false);
          setStoredRange(null);
          return;
        }
        
        // Check if selection is within this message's content area
        if (!contentRef.current) {
          setShowHighlightButton(false);
          setStoredRange(null);
          return;
        }

        if (!isSelectionWithinContent(selection, range)) {
          setShowHighlightButton(false);
          setStoredRange(null);
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
            setStoredRange(null);
            return;
          }
        }

        // Validate that offsets are reasonable
        if (startOffset >= 0 && endOffset <= domText.length && startOffset < endOffset) {
          setSelectedText(text);
          setSelectionRange({ start: startOffset, end: endOffset });
          
          // Clone and store the range for reliable use in handlers
          try {
            const clonedRange = range.cloneRange();
            setStoredRange(clonedRange);
          } catch (e) {
            // If cloning fails, we'll use the offsets directly
            setStoredRange(null);
          }
          
          // Only calculate position for desktop (non-iOS)
          // iOS will use bottom action bar instead
          if (!isIOS) {
            // Position button near selection with viewport clamping
            const rect = range.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const pillHeight = 40; // Approximate pill height
            const pillWidth = onRedact ? 180 : 100; // Approximate pill width
            const padding = 8;
            
            // Prefer above selection, fallback to below
            let top = rect.top - pillHeight - padding;
            let left = rect.left + rect.width / 2;
            
            // If above would be off-screen, position below
            if (top < padding) {
              top = rect.bottom + padding;
            }
            
            // Clamp to viewport
            top = Math.max(padding, Math.min(top, viewportHeight - pillHeight - padding));
            left = Math.max(pillWidth / 2 + padding, Math.min(left, viewportWidth - pillWidth / 2 - padding));
            
            setButtonPosition({ top, left });
          }
          
          setShowHighlightButton(true);
        } else {
          setShowHighlightButton(false);
          setStoredRange(null);
        }
      }, 100); // Slightly longer delay for mobile to allow native menu to appear first
    };

    // Listen to selection changes on the document
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // Also handle touchend/mouseup as backup triggers (for mobile and desktop)
    const handlePointerEnd = () => {
      handleSelectionChange();
    };

    const element = contentRef.current;
    if (element) {
      element.addEventListener('touchend', handlePointerEnd);
      element.addEventListener('mouseup', handlePointerEnd);
    }

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (element) {
        element.removeEventListener('touchend', handlePointerEnd);
        element.removeEventListener('mouseup', handlePointerEnd);
      }
    };
  }, [content, onRedact, isIOS]);

  const handleHighlight = () => {
    if (selectedText && selectionRange) {
      onHighlight(selectedText, selectionRange.start, selectionRange.end);
      setShowHighlightButton(false);
      setStoredRange(null);
      // Clear selection after action
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    }
  };

  const handleRedact = () => {
    if (selectedText && selectionRange && onRedact) {
      onRedact(selectedText, selectionRange.start, selectionRange.end);
      setShowHighlightButton(false);
      setStoredRange(null);
      // Clear selection after action
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
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

  // Hide button on scroll, tap outside, or selection collapse
  useEffect(() => {
    if (!showHighlightButton) return;

    const hidePill = () => {
      setShowHighlightButton(false);
      setStoredRange(null);
      // Don't clear selection on scroll/tap outside - let user keep their selection
    };

    const handleScroll = () => {
      hidePill();
    };

    const handlePointerDown = (e: PointerEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      // Don't hide if clicking the button container or any button inside it
      const highlightButtonContainer = target.closest('[data-highlight-button]');
      if (highlightButtonContainer) {
        // Allow the button's onClick to fire - don't hide
        return;
      }
      // Hide if tapping/clicking outside the content area or pill
      if (contentRef.current && !contentRef.current.contains(target)) {
        hidePill();
      }
    };

    // Check if selection collapsed
    const handleSelectionCheck = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        hidePill();
      }
    };

    // Use setTimeout to ensure button onClick fires first (bubbling phase)
    const handleClick = (e: MouseEvent) => {
      setTimeout(() => {
        handlePointerDown(e);
      }, 0);
    };

    // Listen to scroll on window and content container
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });
    
    // Listen to pointer/touch events for tap outside
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('click', handleClick);
    
    // Check selection state periodically (for collapse detection)
    const selectionCheckInterval = setInterval(handleSelectionCheck, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('click', handleClick);
      clearInterval(selectionCheckInterval);
    };
  }, [showHighlightButton]);

  const handleDismiss = () => {
    setShowHighlightButton(false);
    setStoredRange(null);
    // Clear selection
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  };

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed select-text"
      >
        {renderContentWithHighlights()}
      </div>

      {/* iOS: Bottom action bar */}
      {showHighlightButton && isIOS && (
        <div
          data-highlight-button
          className="fixed z-50 left-0 right-0 bottom-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-3 px-4 py-3"
          style={{
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleHighlight();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 active:opacity-75 transition-opacity touch-manipulation flex-1 max-w-[140px]"
            style={{ touchAction: 'manipulation' }}
          >
            Highlight
          </button>
          {onRedact && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRedact();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:opacity-90 active:opacity-75 transition-opacity touch-manipulation flex-1 max-w-[140px]"
              style={{ touchAction: 'manipulation' }}
            >
              Redact
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDismiss();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            className="px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors touch-manipulation"
            style={{ touchAction: 'manipulation' }}
            aria-label="Dismiss"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Desktop: Floating pill */}
      {showHighlightButton && !isIOS && (
        <div
          data-highlight-button
          className="fixed z-50 flex gap-2 items-center"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent event from bubbling to document
              e.preventDefault(); // Prevent any default behavior
              handleHighlight();
            }}
            onTouchStart={(e) => {
              e.stopPropagation(); // Prevent event from bubbling
            }}
            className="px-3 py-2 text-xs font-medium bg-foreground text-background rounded-lg shadow-lg hover:opacity-90 active:opacity-75 transition-opacity touch-manipulation"
            style={{ touchAction: 'manipulation' }}
          >
            Highlight
          </button>
          {onRedact && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                e.preventDefault(); // Prevent any default behavior
                handleRedact();
              }}
              onTouchStart={(e) => {
                e.stopPropagation(); // Prevent event from bubbling
              }}
              className="px-3 py-2 text-xs font-medium bg-red-600 text-white rounded-lg shadow-lg hover:opacity-90 active:opacity-75 transition-opacity touch-manipulation"
              style={{ touchAction: 'manipulation' }}
            >
              Redact
            </button>
          )}
        </div>
      )}
    </div>
  );
}

