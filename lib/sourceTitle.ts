/**
 * Shared source title derivation for all import paths.
 * Priority: decision-like phrase → topic phrase → first user sentence → fallback.
 * Ensures content-derived, summary-like titles; avoids "User", first-line-only, generic labels.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export const GENERIC_SOURCE_TITLES = new Set([
  'user',
  'assistant',
  'ai',
  'untitled',
  'untitled conversation',
  'quick capture',
  'captured source',
  'hi',
  'hello',
  'hey',
  'thanks',
  'thank you',
]);

const MAX_SCAN_CHARS = 4000;
const TITLE_MAX_CHARS = 52;
const MIN_TITLE_CHARS = 4;

/** Words that often start first-line filler; prefer a later sentence for topic. */
const WEAK_STARTS = new Set(['hi', 'hello', 'hey', 'so', 'ok', 'okay', 'yes', 'no', 'well', 'anyway', 'thanks', 'thank', 'i', 'we', 'the', 'a', 'it']);

/** Decision/topic keywords that suggest a good title phrase. */
const TOPIC_KEYWORDS = /\b(should|whether|how to|strategy|decision|approach|pricing|launch|outreach|gating|path|selection|distribution|version|team|personal|early|user|outreach)\b/i;

/** Compound connectors that often produce good title phrases (X for Y, X vs Y). */
const COMPOUND = /\s+(for|vs\.?|versus|and|or)\s+/i;

function normalizeCandidate(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/[-–—,:;…]+$/g, '').trim();
}

function trimToWordBoundary(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const trimmed = s.slice(0, maxLen + 1).replace(/\s+\S*$/, '').trim();
  return trimmed.length >= MIN_TITLE_CHARS ? trimmed : s.slice(0, maxLen).trim();
}

function isGenericOrWeak(candidate: string): boolean {
  const lower = candidate.toLowerCase();
  if (GENERIC_SOURCE_TITLES.has(lower)) return true;
  const firstWord = lower.split(/\s+/)[0] ?? '';
  if (WEAK_STARTS.has(firstWord)) return true;
  if (candidate.length < MIN_TITLE_CHARS) return true;
  return false;
}

/**
 * Extract sentences from content for scanning (first portion, split on . ! ?).
 */
function getSentences(content: string): string[] {
  const text = content.slice(0, MAX_SCAN_CHARS).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = text.split(/([.!?]+)/);
  const sentences: string[] = [];
  let current = '';
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (/^[.!?]+$/.test(p)) {
      const s = (current + p).trim();
      if (s.length > 0) sentences.push(s);
      current = '';
    } else {
      current += p;
    }
  }
  if (current.trim().length > 0) sentences.push(current.trim());
  return sentences;
}

/**
 * Content-derived source title with priority: decision-like phrase → topic phrase → first sentence.
 * Returns null if nothing good found (caller should use uniqueTimestampedFallback).
 * Lightweight deterministic heuristic; no LLM.
 */
export function deriveSourceTitle(content: string | null | undefined): string | null {
  if (!content || typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (!trimmed) return null;

  // Strip leading role prefix so we don't treat "User: ..." as the title
  const noRole = trimmed.replace(/^(user|assistant|ai|human):\s*/i, '').trim();
  const sentences = getSentences(noRole);
  if (sentences.length === 0) return null;

  // Priority 1: decision-like phrase (question, compound, or keyword-rich sentence)
  for (const sent of sentences) {
    const hasQuestion = sent.includes('?');
    const hasCompound = COMPOUND.test(sent);
    const hasTopicKeyword = TOPIC_KEYWORDS.test(sent);
    if (!hasQuestion && !hasCompound && !hasTopicKeyword) continue;

    const candidate = trimToWordBoundary(normalizeCandidate(sent), TITLE_MAX_CHARS);
    if (!isGenericOrWeak(candidate)) return candidate;
  }

  // Priority 2: first sentence that looks like a topic (not weak start, 5–55 chars)
  for (const sent of sentences) {
    const normalized = normalizeCandidate(sent);
    const candidate = trimToWordBoundary(normalized, TITLE_MAX_CHARS);
    if (candidate.length < 5) continue;
    const lowerStart = (candidate.split(/\s+/)[0] ?? '').toLowerCase();
    if (WEAK_STARTS.has(lowerStart) || lowerStart === 'the' || lowerStart === 'a' || lowerStart === 'it') continue;
    if (!isGenericOrWeak(candidate)) return candidate;
  }

  // Priority 3: first user sentence at word boundary (even if weak start)
  const first = sentences[0];
  if (first) {
    const candidate = trimToWordBoundary(normalizeCandidate(first), TITLE_MAX_CHARS);
    if (!isGenericOrWeak(candidate)) return candidate;
  }

  return null;
}

/** First sentence from first user message (legacy/fallback). Returns null if empty or generic. */
export function deriveFromFirstUserMessage(
  messages: Array<{ role: string; content?: string }>
): string | null {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser?.content?.trim()) return null;
  return deriveSourceTitle(firstUser.content) ?? (() => {
    const text = firstUser.content!.replace(/\s+/g, ' ').trim();
    const firstSentence = text.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() ?? text.slice(0, 60).trim();
    const candidate = trimToWordBoundary(firstSentence, TITLE_MAX_CHARS);
    if (candidate.length < MIN_TITLE_CHARS || GENERIC_SOURCE_TITLES.has(candidate.toLowerCase())) return null;
    return candidate;
  })();
}

/** First non-empty line of transcript, strip role prefix, first sentence, ~12 words. Legacy fallback. */
export function deriveFromTranscriptFirstLine(transcript: string): string | null {
  if (!transcript || typeof transcript !== 'string') return null;
  const trimmed = transcript.trim();
  if (!trimmed) return null;

  const firstLine = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return null;

  const noRole = firstLine.replace(/^(user|assistant|ai|human):\s*/i, '').trim();
  if (!noRole) return null;

  const fromContent = deriveSourceTitle(noRole);
  if (fromContent) return fromContent;

  const sentenceMatch = noRole.match(/(.+?[.!?])\s/);
  const segment = sentenceMatch?.[1] ?? noRole;
  const words = segment.split(/\s+/).filter((w) => w.length > 0).slice(0, 12);
  const candidate = words.join(' ').replace(/\s+/g, ' ').replace(/[-–—,:;…]+$/g, '').trim();
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

/**
 * Ensure the conversation title is unique for this user by appending " (2)", " (3)", etc. when needed.
 */
export async function ensureUniqueConversationTitle(
  supabase: SupabaseClient,
  userId: string,
  title: string
): Promise<string> {
  const base = title.trim();
  if (!base) return uniqueTimestampedFallback('Source');

  const { count: exactCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('title', base);

  if ((exactCount ?? 0) === 0) return base;

  const { data: likeRows } = await supabase
    .from('conversations')
    .select('title')
    .eq('user_id', userId)
    .like('title', `${base} (%)`);

  const numbers = (likeRows ?? [])
    .map((r: { title?: string | null }) => r.title)
    .filter((t): t is string => typeof t === 'string' && t.startsWith(`${base} (`) && t.endsWith(')'))
    .map((t) => t.slice(base.length + 2, -1))
    .filter((s) => /^\d+$/.test(s))
    .map((s) => parseInt(s, 10));
  const maxN = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `${base} (${maxN + 1})`;
}
