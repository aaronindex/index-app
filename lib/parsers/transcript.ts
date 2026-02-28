// lib/parsers/transcript.ts
// Deterministic parser for pasted chat transcripts

export interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ParsedTranscript {
  messages: ParsedMessage[];
  userCount: number;
  assistantCount: number;
}

// User markers (case-insensitive)
const USER_MARKERS = [
  /^\s*\*\*User:\*\*\s*/i,
  /^\s*\*\*Me:\*\*\s*/i,
  /^\s*\*\*Human:\*\*\s*/i,
  /^\s*User:\s*/i,
  /^\s*You:\s*/i,
  /^\s*Me:\s*/i,
  /^\s*Human:\s*/i,
  /^\s*USER:\s*/,
  /^\s*ME:\s*/,
  /^\s*HUMAN:\s*/,
  /^\s*You Said:\s*/i,
  /^\s*You said:\s*/i,
  /^\s*YOU SAID:\s*/,
];

// Assistant markers (case-insensitive)
const ASSISTANT_MARKERS = [
  /^\s*\*\*Assistant:\*\*\s*/i,
  /^\s*\*\*AI:\*\*\s*/i,
  /^\s*\*\*ChatGPT:\*\*\s*/i,
  /^\s*\*\*Claude:\*\*\s*/i,
  /^\s*Assistant:\s*/i,
  /^\s*AI:\s*/i,
  /^\s*Chat\s?GPT:\s*/i,  // "Chat GPT:" or "ChatGPT:"
  /^\s*ChatGPT:\s*/i,
  /^\s*Claude:\s*/i,
  /^\s*ASSISTANT:\s*/,
  /^\s*AI:\s*/,
  /^\s*CHATGPT:\s*/,
  /^\s*CLAUDE:\s*/,
  /^\s*ChatGPT Said:\s*/i,
  /^\s*ChatGPT said:\s*/i,
  /^\s*CHATGPT SAID:\s*/,
  /^\s*Claude Said:\s*/i,
  /^\s*Claude said:\s*/i,
  /^\s*CLAUDE SAID:\s*/,
];

function findMarker(line: string): 'user' | 'assistant' | null {
  for (const marker of USER_MARKERS) {
    if (marker.test(line)) {
      return 'user';
    }
  }
  for (const marker of ASSISTANT_MARKERS) {
    if (marker.test(line)) {
      return 'assistant';
    }
  }
  return null;
}

/** True if any line in text matches a known user/assistant role marker (same markers as parseTranscript). */
export function hasRoleMarkers(text: string): boolean {
  if (!text.trim()) return false;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (findMarker(line)) return true;
  }
  return false;
}

function stripMarker(line: string, role: 'user' | 'assistant'): string {
  const markers = role === 'user' ? USER_MARKERS : ASSISTANT_MARKERS;
  for (const marker of markers) {
    if (marker.test(line)) {
      return line.replace(marker, '').trim();
    }
  }
  return line.trim();
}

export function parseTranscript(
  text: string,
  options: {
    swapRoles?: boolean;
    treatAsSingleBlock?: boolean;
  } = {}
): ParsedTranscript {
  const { swapRoles = false, treatAsSingleBlock = false } = options;

  // If treat as single block, return entire text as user message
  if (treatAsSingleBlock) {
    return {
      messages: [{ role: 'user', content: text.trim() }],
      userCount: 1,
      assistantCount: 0,
    };
  }

  const lines = text.split(/\r?\n/);
  const messages: ParsedMessage[] = [];
  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent: string[] = [];
  const debugTurnHeaders: string[] = [];

  for (const line of lines) {
    const marker = findMarker(line);
    
    if (marker) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        debugTurnHeaders.push(line.trim().substring(0, 80));
      }
      // Save previous message if exists
      if (currentRole && currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content) {
          messages.push({
            role: swapRoles ? (currentRole === 'user' ? 'assistant' : 'user') : currentRole,
            content,
          });
        }
      }
      // Start new message
      currentRole = marker;
      currentContent = [stripMarker(line, marker)];
    } else if (currentRole) {
      // Continue current message
      currentContent.push(line);
    } else {
      // No marker yet, accumulate as potential first message
      currentContent.push(line);
    }
  }

  // Save last message
  if (currentRole && currentContent.length > 0) {
    const content = currentContent.join('\n').trim();
    if (content) {
      messages.push({
        role: swapRoles ? (currentRole === 'user' ? 'assistant' : 'user') : currentRole,
        content,
      });
    }
  }

  // If no markers found, treat entire text as single user message
  if (messages.length === 0 && text.trim()) {
    return {
      messages: [{ role: 'user', content: text.trim() }],
      userCount: 1,
      assistantCount: 0,
    };
  }

  // Count roles
  const userCount = messages.filter((m) => m.role === 'user').length;
  const assistantCount = messages.filter((m) => m.role === 'assistant').length;

  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && (lines.length > 0 || messages.length > 0)) {
    const debug = {
      total_lines: lines.length,
      detected_turns: messages.length,
      role_counts: { user: userCount, assistant: assistantCount },
      first_3_turn_headers: debugTurnHeaders.slice(0, 3),
    };
    console.log('[parseTranscript]', JSON.stringify(debug));
  }

  return {
    messages,
    userCount,
    assistantCount,
  };
}

export function generateAutoTitle(transcript: string, parsed: ParsedTranscript): string {
  // Try to use first user message
  const firstUserMessage = parsed.messages.find((m) => m.role === 'user');
  if (firstUserMessage) {
    const title = firstUserMessage.content
      .split('\n')[0]
      .trim()
      .substring(0, 60);
    if (title) {
      return title;
    }
  }

  // Fallback to first line of transcript
  const firstLine = transcript.split('\n')[0].trim().substring(0, 60);
  return firstLine || 'Untitled Conversation';
}

