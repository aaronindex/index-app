// lib/tensionDisplay.ts
// Normalize tension left/right text for display (remove artifacts, shorten to conceptual phrase, capitalize).

const MAX_DISPLAY_LEN = 40;

const PREFIXES = /^\s*(context|text|excerpt|note|ext)\s*:\s*/i;

/**
 * Extract a short conceptual phrase for tension display.
 * 1. If phrase contains "focus on", use words after it.
 * 2. Otherwise use last 3–5 meaningful words.
 * 3. Fallback: last 4 words.
 * 4. Capitalize result.
 */
function extractConceptualPhrase(s: string): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';

  let segment = trimmed;
  const focusOnMatch = trimmed.match(/\bfocus\s+on\s+(.+)/i);
  if (focusOnMatch) {
    segment = focusOnMatch[1].trim();
  }

  const words = segment.split(/\s+/).filter(Boolean);
  if (words.length <= 4) return segment;

  // Last 3–5 meaningful words
  const take = Math.min(5, Math.max(3, Math.ceil(words.length / 2)));
  const fromEnd = words.slice(-take);
  let phrase = fromEnd.join(' ').replace(/'s\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (phrase.length > MAX_DISPLAY_LEN) {
    // Trim to max length at word boundary
    const truncated = phrase.slice(0, MAX_DISPLAY_LEN).replace(/\s+\S*$/, '').trim();
    phrase = truncated || phrase.slice(0, MAX_DISPLAY_LEN).trim();
  }
  return phrase.length >= 3 ? phrase : words.slice(-4).join(' ');
}

/**
 * Capitalize first letter of the string (first word only for display).
 */
function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * Clean and normalize tension text before rendering.
 * Removes prefixes, extracts short conceptual phrase, capitalizes.
 */
export function normalizeTensionText(text: string): string {
  if (typeof text !== 'string') return '';
  let s = text.replace(PREFIXES, '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  s = extractConceptualPhrase(s);
  if (s.length > MAX_DISPLAY_LEN) s = s.slice(0, MAX_DISPLAY_LEN).replace(/\s+\S*$/, '').trim();
  return capitalize(s);
}
