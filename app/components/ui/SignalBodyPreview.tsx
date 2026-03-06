'use client';

import { useState } from 'react';

const MAX_PREVIEW_CHARS = 160;

interface SignalBodyPreviewProps {
  /** Full body text to show (truncated by default). */
  text: string;
  /** Optional class for the text container. */
  className?: string;
  /** Optional class for the toggle link. */
  linkClassName?: string;
}

/**
 * Renders signal body as a short preview (~2 lines / ~160 chars) with inline
 * "View full" / "Show less" toggle. Expansion is inline; no navigation.
 */
export default function SignalBodyPreview({
  text,
  className = '',
  linkClassName = '',
}: SignalBodyPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const shouldTruncate = trimmed.length > MAX_PREVIEW_CHARS;
  const preview =
    !expanded && shouldTruncate
      ? trimmed.slice(0, MAX_PREVIEW_CHARS).trim() + (trimmed.length > MAX_PREVIEW_CHARS ? '…' : '')
      : trimmed;

  return (
    <div className={className}>
      <p className="text-sm text-[rgb(var(--muted))] whitespace-pre-wrap break-words">
        {preview}
      </p>
      {shouldTruncate && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={`mt-1 text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors ${linkClassName}`}
        >
          {expanded ? 'Show less' : 'View full'}
        </button>
      )}
    </div>
  );
}
