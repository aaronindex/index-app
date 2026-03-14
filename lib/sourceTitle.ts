/**
 * Shared source title derivation for all import paths.
 * Ensures distinct, content-derived titles; avoids "User", repeated project/generic labels.
 */

export const GENERIC_SOURCE_TITLES = new Set([
  'user',
  'assistant',
  'ai',
  'untitled',
  'untitled conversation',
  'quick capture',
  'captured source',
]);

/** First sentence from first user message (content-derived). Returns null if empty or generic. */
export function deriveFromFirstUserMessage(
  messages: Array<{ role: string; content?: string }>
): string | null {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser?.content?.trim()) return null;
  const text = firstUser.content.replace(/\s+/g, ' ').trim();
  const firstSentence = text.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? text.slice(0, 60).trim();
  const candidate = firstSentence.slice(0, 52).replace(/\s+\S*$/, '').trim();
  if (candidate.length < 4) return null;
  if (GENERIC_SOURCE_TITLES.has(candidate.toLowerCase())) return null;
  return candidate;
}

/** First non-empty line of transcript, strip role prefix, first sentence, ~12 words. Returns null if empty or generic. */
export function deriveFromTranscriptFirstLine(transcript: string): string | null {
  if (!transcript || typeof transcript !== 'string') return null;
  const trimmed = transcript.trim();
  if (!trimmed) return null;

  const firstLine = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return null;

  let candidate = firstLine
    .replace(/^(user|assistant|ai|human):\s*/i, '')
    .trim();
  if (!candidate) return null;

  const sentenceMatch = candidate.match(/(.+?[.!?])\s/);
  if (sentenceMatch?.[1]) candidate = sentenceMatch[1];

  const words = candidate.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return null;
  candidate = words.slice(0, 12).join(' ')
    .replace(/\s+/g, ' ')
    .replace(/[-–—,:;…]+$/g, '')
    .trim();

  if (!candidate || GENERIC_SOURCE_TITLES.has(candidate.toLowerCase())) return null;
  return candidate;
}

/**
 * Unique fallback so multiple imports in one session don't share the same label.
 * Uses seconds in timestamp; optional disambiguateIndex appends " (2)", " (3)" for same-second.
 */
export function uniqueTimestampedFallback(
  prefix: string,
  disambiguateIndex?: number
): string {
  const now = new Date();
  const formatted = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const base = `${prefix} — ${formatted}`;
  if (disambiguateIndex != null && disambiguateIndex > 1) {
    return `${base} (${disambiguateIndex})`;
  }
  return base;
}
