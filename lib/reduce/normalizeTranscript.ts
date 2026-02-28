// lib/reduce/normalizeTranscript.ts
// Deterministic transcript normalizer for reduction.
// No ML, no heuristics that can drift. Uses existing parseTranscript markers.

import { parseTranscript, hasRoleMarkers } from '@/lib/parsers/transcript';

export type NormalizedMessage = {
  role: 'user' | 'assistant';
  content: string;
  index_in_conversation: number;
};

export type NormalizedTranscript = {
  messages: NormalizedMessage[];
  detected_format: 'chat_roles' | 'email_thread' | 'plain' | 'unknown';
  had_explicit_roles: boolean;
  normalized_roles: boolean;
  warnings: string[];
};

/**
 * Normalize arbitrary pasted content into a canonical message list for reduction.
 * - Detects common role markers via existing parseTranscript.
 * - Collapses consecutive lines per role.
 * - Strips leading/trailing ``` fences deterministically.
 */
export function normalizeTranscriptForReduction(raw: string): NormalizedTranscript {
  const warnings: string[] = [];
  let text = raw ?? '';

  // Strip simple leading/trailing ``` fences if present
  const lines = text.split(/\r?\n/);
  if (lines.length >= 2 && lines[0].trim().startsWith('```') && lines[lines.length - 1].trim().startsWith('```')) {
    text = lines.slice(1, -1).join('\n');
  }

  const hasMarkers = hasRoleMarkers(text);
  if (!text.trim()) {
    return {
      messages: [],
      detected_format: 'unknown',
      had_explicit_roles: false,
      normalized_roles: false,
      warnings: ['empty_input'],
    };
  }

  if (hasMarkers) {
    const parsed = parseTranscript(text);
    const messages: NormalizedMessage[] = parsed.messages.map((m, idx) => ({
      role: m.role,
      content: m.content,
      index_in_conversation: idx,
    }));

    return {
      messages,
      detected_format: 'chat_roles',
      had_explicit_roles: true,
      normalized_roles: true,
      warnings,
    };
  }

  // Fallback: treat as plain single-user block
  return {
    messages: [
      {
        role: 'user',
        content: text.trim(),
        index_in_conversation: 0,
      },
    ],
    detected_format: 'plain',
    had_explicit_roles: false,
    normalized_roles: false,
    warnings,
  };
}

