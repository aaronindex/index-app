'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
  type ReactNode,
} from 'react';
import { useSpotlightTargetRect } from './useSpotlightTargetRect';
import Button from '../ui/Button';

export type SpotlightStep = {
  id: string;
  title?: string;
  body: ReactNode;
  targetSelector: string;
  placement?: 'right' | 'left' | 'top' | 'bottom';
  actionLabel?: string;
  onAction?: () => void;
};

export type SpotlightTourProps = {
  isOpen: boolean;
  steps: SpotlightStep[];
  initialStepId?: string;
  onClose: () => void;
  onComplete: () => void;
};

const OVERLAY_OPACITY = 0.65;
const SPOTLIGHT_PADDING = 12;
const SOFT_EDGE_BLUR = 10;

function getPanelPosition(
  placement: 'right' | 'left' | 'top' | 'bottom',
  rect: DOMRect,
  panelWidth: number,
  panelHeight: number
): { left: number; top: number } {
  const gap = 12;
  const viewW = typeof window !== 'undefined' ? window.innerWidth : 800;
  const viewH = typeof window !== 'undefined' ? window.innerHeight : 600;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  switch (placement) {
    case 'right': {
      let left = rect.right + gap;
      if (left + panelWidth > viewW - 24) left = rect.left - panelWidth - gap;
      return { left, top: Math.max(24, Math.min(centerY - panelHeight / 2, viewH - panelHeight - 24)) };
    }
    case 'left': {
      let left = rect.left - panelWidth - gap;
      if (left < 24) left = rect.right + gap;
      return { left, top: Math.max(24, Math.min(centerY - panelHeight / 2, viewH - panelHeight - 24)) };
    }
    case 'top': {
      let top = rect.top - panelHeight - gap;
      if (top < 24) top = rect.bottom + gap;
      return { left: Math.max(24, Math.min(centerX - panelWidth / 2, viewW - panelWidth - 24)), top };
    }
    case 'bottom':
    default: {
      let top = rect.bottom + gap;
      if (top + panelHeight > viewH - 24) top = rect.top - panelHeight - gap;
      return { left: Math.max(24, Math.min(centerX - panelWidth / 2, viewW - panelWidth - 24)), top };
    }
  }
}

export default function SpotlightTour({
  isOpen,
  steps,
  initialStepId,
  onClose,
  onComplete,
}: SpotlightTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current;
    prevOpenRef.current = isOpen;
    if (justOpened) {
      const i =
        initialStepId && steps.length
          ? steps.findIndex((s) => s.id === initialStepId)
          : -1;
      setStepIndex(i >= 0 ? i : 0);
    }
  }, [isOpen, initialStepId, steps]);
  const titleId = useId();
  const descriptionId = useId();

  const step = steps[stepIndex] ?? null;
  const selector = step?.targetSelector ?? null;
  const { rect, found } = useSpotlightTargetRect(selector, isOpen && !!selector);

  const isLast = stepIndex >= steps.length - 1;

  const handleNext = useCallback(() => {
    if (step?.onAction) step.onAction();
    if (isLast) {
      onComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [step, isLast, onComplete]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    if (first) {
      const t = setTimeout(() => first.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [isOpen, stepIndex]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;

      const current = document.activeElement as HTMLElement | null;
      const idx = current ? focusables.indexOf(current) : -1;
      const nextIdx = e.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx + 1) % focusables.length;
      const next = focusables[nextIdx];
      if (next) {
        e.preventDefault();
        next.focus();
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stepIndex]);

  if (!isOpen || steps.length === 0) return null;

  const placement = step?.placement ?? 'bottom';
  const panelStyle: React.CSSProperties = found && rect
    ? getPanelPosition(placement, rect, 320, 200)
    : {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };

  const maskDataUrl =
    found && rect
      ? (() => {
          const x = rect.x - SPOTLIGHT_PADDING;
          const y = rect.y - SPOTLIGHT_PADDING;
          const w = rect.width + SPOTLIGHT_PADDING * 2;
          const h = rect.height + SPOTLIGHT_PADDING * 2;
          const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">' +
            '<defs><mask id="spotlight-cutout">' +
            '<rect width="100%" height="100%" fill="white"/>' +
            '<g filter="url(#soften)">' +
            '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="black"/>' +
            '</g></mask>' +
            '<filter id="soften"><feGaussianBlur in="SourceGraphic" stdDeviation="' + SOFT_EDGE_BLUR + '"/></filter>' +
            '</defs>' +
            '<rect width="100%" height="100%" fill="white" mask="url(#spotlight-cutout)"/>' +
            '</svg>';
          return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
        })()
      : undefined;

  return (
    <div
      className="fixed inset-0 z-[100] transition-opacity duration-[180ms]"
      style={{ opacity: isOpen ? 1 : 0 }}
      aria-modal="true"
      role="dialog"
      aria-labelledby={step?.title ? titleId : undefined}
      aria-describedby={descriptionId}
    >
      {/* Dim overlay with spotlight cutout (SVG mask, soft edge via blur); blocks interaction outside panel. */}
      <div
        className="absolute inset-0 bg-black"
        style={{
          opacity: OVERLAY_OPACITY,
          maskImage: maskDataUrl,
          WebkitMaskImage: maskDataUrl,
        }}
      />

      {/* Content panel: fixed position, no layout shift; above overlay for interaction. */}
      <div
        ref={panelRef}
        className="absolute z-10 w-80 max-w-[calc(100vw-32px)] rounded-xl bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.12)] shadow-lg p-4 transition-opacity duration-[180ms]"
        style={panelStyle}
        tabIndex={-1}
      >
        {step?.title && (
          <h2 id={titleId} className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-2">
            {step.title}
          </h2>
        )}
        <div id={descriptionId} className="text-sm text-[rgb(var(--text))] mb-4">
          {step?.body}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors px-2 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
            aria-label="Skip tour"
          >
            Skip
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            aria-label={isLast ? 'Finish tour' : 'Next step'}
          >
            {isLast ? (step?.actionLabel ?? 'Done') : (step?.actionLabel ?? 'Next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
