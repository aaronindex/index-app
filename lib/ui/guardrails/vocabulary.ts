// lib/ui/guardrails/vocabulary.ts
// Dev-only guardrail to prevent internal structural vocabulary leaking into UI labels.
// Checks ONLY strings we control (section headers, button labels, etc.).

const FORBIDDEN_UI_TOKENS = /(arc|arcs|phase|phases|pulse|stable|state_hash|hash|tension|density|inference|job|recompute)/i;

/**
 * Assert that a set of UI labels does not contain forbidden internal vocabulary.
 * Dev-only: no-ops outside development.
 */
export function assertNoForbiddenVocabulary(labels: string[], context: string): void {
  if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'development') {
    return;
  }

  for (const label of labels) {
    if (!label) continue;
    if (FORBIDDEN_UI_TOKENS.test(label)) {
      // Throw in development to catch regressions early.
      throw new Error(
        `[VocabularyGuard] Forbidden vocabulary detected in ${context}: "${label}"`
      );
    }
  }
}

