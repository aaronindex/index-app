// lib/tensionDisplay.ts
// Normalize tension left/right text for display (remove artifacts, shorten, capitalize).

const MAX_DISPLAY_LEN = 40;
const LONG_SENTENCE_THRESHOLD = 80;

const PREFIXES = /^\s*(context|text|excerpt|note)\s*:\s*/i;

/**
 * Extract a short key phrase from a long sentence: first clause, or last substantive words.
 */
function extractKeyPhrase(s: string): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= MAX_DISPLAY_LEN) return trimmed;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return trimmed.slice(0, MAX_DISPLAY_LEN).trim();

  // Prefer last 3–5 words as key phrase (often the noun phrase after "focus on X" / "value of Y")
  const take = Math.min(5, Math.max(3, Math.ceil(words.length / 2)));
  const fromEnd = words.slice(-take);
  let phrase = fromEnd.join(' ').replace(/'s\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (phrase.length > MAX_DISPLAY_LEN) phrase = phrase.slice(0, MAX_DISPLAY_LEN).trim();
  if (phrase.length >= 5) return phrase;

  // Fallback: first clause up to max length
  const clauseMatch = trimmed.match(/^[^.,;]+/);
  if (clauseMatch) {
    const clause = clauseMatch[0].trim().slice(0, MAX_DISPLAY_LEN).trim();
    if (clause.length >= 5) return clause;
  }
  return trimmed.slice(0, MAX_DISPLAY_LEN).trim();
}

/**
 * Capitalize first letter of the string (and of the first word only for simplicity).
 */
function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * Clean and normalize tension text before rendering.
 * Removes prefixes (context:, text:, excerpt:, note:), trims, shortens long sentences, capitalizes.
 */
export function normalizeTensionText(text: string): string {
  if (typeof text !== 'string') return '';
  let s = text.replace(PREFIXES, '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length > LONG_SENTENCE_THRESHOLD) s = extractKeyPhrase(s);
  if (s.length > MAX_DISPLAY_LEN) s = s.slice(0, MAX_DISPLAY_LEN).trim();
  return capitalize(s);
}
