// lib/digest/helpers.ts
/**
 * Helper functions for digest rendering
 */

/**
 * Derive a display title from loop content if conversation title is missing/untitled
 */
export function getLoopDisplayTitle(
  loop: {
    conversation_title?: string | null;
    snippet?: string;
    title?: string;
  }
): string {
  // Priority 1: loop.title if present and not "Untitled Conversation"
  if (loop.title && loop.title !== 'Untitled Conversation' && loop.title.trim()) {
    return loop.title;
  }

  // Priority 2: conversation_title if present and not "Untitled Conversation"
  if (loop.conversation_title && loop.conversation_title !== 'Untitled Conversation' && loop.conversation_title.trim()) {
    return loop.conversation_title;
  }

  // Priority 3: Derive from snippet/content
  if (loop.snippet) {
    // Extract first sentence or imperative fragment
    let derived = loop.snippet.trim();
    
    // Remove "Next:" or "Next step:" prefixes
    derived = derived.replace(/^(Next:\s*|Next step:\s*|Next step we can\s*)/i, '');
    
    // Take first sentence (up to period, exclamation, or question mark)
    const firstSentence = derived.match(/^[^.!?]+[.!?]?/)?.[0] || derived;
    
    // Trim to 60 chars
    if (firstSentence.length > 60) {
      return firstSentence.substring(0, 57).trim() + '...';
    }
    
    return firstSentence.trim();
  }

  return 'Open Loop';
}

/**
 * Normalize Open Loop snippet text - remove "we can" phrasing, ensure imperative
 */
export function normalizeLoopSnippet(snippet: string): string {
  if (!snippet) return snippet;
  
  let normalized = snippet.trim();
  
  // Remove "Next step we can..." patterns
  normalized = normalized.replace(/^Next step we can\s+/i, 'Next: ');
  normalized = normalized.replace(/^Next step:\s*/i, 'Next: ');
  
  // Remove "we can" from anywhere
  normalized = normalized.replace(/\bwe can\s+/gi, '');
  
  // Ensure it starts with imperative if it doesn't already have "Next:"
  if (!normalized.startsWith('Next:') && !normalized.match(/^(Decide|Identify|Get|Find|Choose|Select|Complete|Finish)/i)) {
    // If it's a question, convert to imperative
    if (normalized.endsWith('?')) {
      normalized = normalized.slice(0, -1).trim();
    }
  }
  
  return normalized;
}

/**
 * Normalize Recommended Next Step reason - remove generic filler
 */
export function normalizeStepReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  
  const normalized = reason.trim();
  
  // Ban generic filler phrases
  const bannedPhrases = [
    'will help in selecting appropriate',
    'will advance the resolution',
    'maintain forward momentum',
    'will help ensure',
    'will contribute to',
    'will facilitate',
  ];
  
  for (const phrase of bannedPhrases) {
    if (normalized.toLowerCase().includes(phrase.toLowerCase())) {
      return null; // Omit if contains banned phrase
    }
  }
  
  // If reason is too generic (just repeats action), omit
  if (normalized.length < 20) {
    return null;
  }
  
  // Cap at 100 chars
  if (normalized.length > 100) {
    return normalized.substring(0, 97).trim() + '...';
  }
  
  return normalized;
}
