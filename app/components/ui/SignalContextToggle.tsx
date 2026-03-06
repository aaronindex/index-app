'use client';

import { useState } from 'react';

interface SignalContextToggleProps {
  /** Context text (body/description). When present, toggle is shown; hidden by default. */
  context: string | null;
}

/**
 * Renders "Show context" / "Hide context" toggle. Context is hidden by default.
 * When expanded, shows "Context: {text}" in a secondary block.
 * Shown for every signal that has context (no length-based hiding).
 */
export default function SignalContextToggle({ context }: SignalContextToggleProps) {
  const [expanded, setExpanded] = useState(false);

  if (!context || !context.trim()) return null;

  return (
    <div
      className="mt-0.5 mb-2"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className="text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
      >
        {expanded ? 'Hide context' : 'Show context'}
      </button>
      {expanded && (
        <div className="mt-1.5 pt-1.5 border-t border-[rgb(var(--ring)/0.08)]">
          <p className="text-xs text-[rgb(var(--muted))] opacity-90 leading-relaxed whitespace-pre-wrap break-words">
            Context: {context.trim()}
          </p>
        </div>
      )}
    </div>
  );
}
