'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const PADDING = 8;

function getRect(selector: string): { rect: DOMRect; found: true } | { rect: null; found: false } {
  if (typeof document === 'undefined') return { rect: null, found: false };
  const el = document.querySelector(selector);
  if (!el || !(el instanceof Element)) return { rect: null, found: false };
  const rect = el.getBoundingClientRect();
  return {
    rect: new DOMRect(
      rect.left - PADDING,
      rect.top - PADDING,
      rect.width + PADDING * 2,
      rect.height + PADDING * 2
    ),
    found: true,
  };
}

/**
 * Returns the bounding rect for a selector, updated on resize/scroll (throttled with rAF).
 * Use when a spotlight overlay needs to track a target element.
 */
export function useSpotlightTargetRect(
  selector: string | null,
  isActive: boolean
): { rect: DOMRect | null; found: boolean } {
  const [state, setState] = useState<{ rect: DOMRect | null; found: boolean }>(() =>
    isActive && selector ? getRect(selector) : { rect: null, found: false }
  );
  const rafRef = useRef<number | null>(null);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const update = useCallback(() => {
    if (!selectorRef.current || !isActive) {
      setState({ rect: null, found: false });
      return;
    }
    const next = getRect(selectorRef.current);
    setState({ rect: next.rect, found: next.found });
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !selector) {
      setState({ rect: null, found: false });
      return;
    }
    update();

    const tick = () => {
      rafRef.current = null;
      update();
    };

    const schedule = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);

    return () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [selector, isActive, update]);

  return state;
}
