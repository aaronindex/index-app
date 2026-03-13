'use client';

import { useState } from 'react';

export interface ReadStructureSignal {
  title: string;
  type?: 'decision' | 'task';
}

interface ReadStructureProps {
  signals: ReadStructureSignal[];
  arc?: string;
  /** Controlled open state; when undefined, component is uncontrolled. */
  open?: boolean;
  /** Callback when toggle is clicked (for controlled use). */
  onToggle?: () => void;
  /** Render as inline trigger + expandable content. When false, only the expandable content is rendered (e.g. when parent controls the trigger). */
  withTrigger?: boolean;
}

export default function ReadStructure({
  signals,
  arc,
  open: controlledOpen,
  onToggle,
  withTrigger = true,
}: ReadStructureProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onToggle ?? (() => {})) : () => setInternalOpen((v) => !v);

  const hasContent = signals.length > 0 || (arc != null && arc.trim() !== '');

  if (!hasContent && withTrigger) return null;
  if (!hasContent) return null;

  return (
    <div className="mt-3">
      {withTrigger && (
        <button
          type="button"
          onClick={setOpen}
          className="text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors underline underline-offset-2"
        >
          Read Structure →
        </button>
      )}
      {open && (
        <div className="mt-3 pt-3 border-t border-[rgb(var(--ring)/0.12)]">
          <p className="text-xs font-medium text-[rgb(var(--muted))] mb-2">
            Signals contributing
          </p>
          <ul className="list-none space-y-1.5 text-sm text-[rgb(var(--text))]">
            {signals.map((s, i) => (
              <li key={i}>
                • {s.title}
                {s.type != null && (
                  <span className="text-[rgb(var(--muted))] ml-1">({s.type})</span>
                )}
              </li>
            ))}
          </ul>
          {arc != null && arc.trim() !== '' && (
            <>
              <p className="text-xs font-medium text-[rgb(var(--muted))] mt-3 mb-1">Arc</p>
              <p className="text-sm text-[rgb(var(--text))]">{arc}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
