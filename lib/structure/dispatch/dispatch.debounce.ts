// lib/structure/dispatch/dispatch.debounce.ts
// Debounce utilities for structure job dispatch

/**
 * Generate default debounce key
 * Format: ${scope}:${reason}
 */
export function generateDebounceKey(scope: string, reason: string): string {
  return `${scope}:${reason}`;
}
