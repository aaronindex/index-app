'use client';

import { useState } from 'react';

export interface ReadStructureSignal {
  title: string;
  type?: 'decision' | 'task';
}

interface ReadStructureProps {
  signals: ReadStructureSignal[];
  arc?: string;
  /** Optional: number of sources (e.g. projects) for footer "N signals across M sources". */
  sourceCount?: number;
  /** Controlled open state; when undefined, component is uncontrolled. */
  open?: boolean;
  /** Callback when toggle is clicked (for controlled use). */
  onToggle?: () => void;
  /** Render as inline trigger + expandable content. When false, only the expandable content is rendered. */
  withTrigger?: boolean;
  /** When true, always show the "Read structure ▸" trigger even when arc and signals are empty (e.g. Home Direction). */
  alwaysShowTrigger?: boolean;
}

export default function ReadStructure({
  signals,
  arc,
  sourceCount,
  open: controlledOpen,
  onToggle,
  withTrigger = true,
  alwaysShowTrigger = false,
}: ReadStructureProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onToggle ?? (() => {})) : () => setInternalOpen((v) => !v);

  const hasContent = signals.length > 0 || (arc != null && arc.trim() !== '');
  const hasArc = arc != null && arc.trim() !== '';
  const showFooter = sourceCount != null && sourceCount > 0 && signals.length > 0;

  const showTrigger = withTrigger && (hasContent || alwaysShowTrigger);
  if (!showTrigger && !hasContent) return null;
  if (!withTrigger && !hasContent) return null;

  return (
    <div className="mt-3">
      {showTrigger && (
        <button
          type="button"
          onClick={setOpen}
          className="text-xs font-normal text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors underline underline-offset-2"
        >
          Read structure {open ? '▾' : '▸'}
        </button>
      )}
      <div
        className="grid transition-[grid-template-rows] duration-150 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-3 pt-3 border-t border-[rgb(var(--ring)/0.12)]">
            {hasArc && (
              <>
                <p className="text-xs font-medium text-[rgb(var(--muted))] mb-1">
                  Arc informing this reading
                </p>
                <p className="text-sm text-[rgb(var(--text))] mb-3">{arc}</p>
              </>
            )}
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
            {showFooter && (
              <p className="text-[11px] text-[rgb(var(--muted))] mt-3">
                {signals.length} {signals.length === 1 ? 'signal' : 'signals'} across{' '}
                {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
