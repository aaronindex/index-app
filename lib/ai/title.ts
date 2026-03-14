// lib/ai/title.ts
// AI-powered conversation title generation with strict constraints

import OpenAI from 'openai';
import { openaiRequest } from './request';

// Lazy initialization - only create OpenAI client when needed
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({
    apiKey,
  });
}

const MAX_TITLE_LENGTH = 52;
const MIN_WORDS = 4;
const MAX_WORDS = 9;

const FORBIDDEN_STARTS = [
  'You are',
  'We are',
  'This chat',
  'Conversation',
  'Transcript',
];

/**
 * Generate a clean, constrained title for a conversation using AI
 */
export async function generateConversationTitle(
  messages: Array<{ role: string; content: string }>,
  projectName?: string
): Promise<string> {
  if (!messages || messages.length === 0) {
    return 'Untitled conversation';
  }

  // Take first 1-3 messages or first ~1000 chars
  let excerpt = '';
  let charCount = 0;
  const maxChars = 1200;

  for (const msg of messages.slice(0, 3)) {
    if (charCount >= maxChars) break;
    const content = msg.content.trim();
    if (content) {
      const remaining = maxChars - charCount;
      excerpt += (excerpt ? '\n\n' : '') + content.substring(0, remaining);
      charCount += content.length;
      if (charCount >= maxChars) break;
    }
  }

  if (!excerpt.trim()) {
    return 'Untitled conversation';
  }

  const systemPrompt = 'You generate short, clean conversation titles.';
  
  const userPrompt = `Generate a short title for this conversation.

Rules:
- 4-9 words
- max 52 characters
- no quotes
- no trailing punctuation
- only allowed punctuation: ":" and "/"
- do NOT start with: "You are", "We are", "This chat", "Conversation", "Transcript"
- output ONLY the title text

${projectName ? `Project: ${projectName}\n` : ''}Conversation excerpt:
<<<${excerpt}>>>

Return only the title.`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await openaiRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();

    let title = data.choices[0]?.message?.content?.trim() || '';

    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '').trim();

    // Remove trailing punctuation (except : and /)
    title = title.replace(/[.,;!?]+$/, '').trim();

    // Validate and enforce constraints
    if (title.length > MAX_TITLE_LENGTH) {
      title = title.substring(0, MAX_TITLE_LENGTH).trim();
    }

    // Check word count
    const words = title.split(/\s+/).filter((w: string) => w.length > 0);
    if (words.length < MIN_WORDS || words.length > MAX_WORDS) {
      // Fallback to deterministic title
      return generateFallbackTitle();
    }

    // Check forbidden starts
    const titleLower = title.toLowerCase();
    for (const forbidden of FORBIDDEN_STARTS) {
      if (titleLower.startsWith(forbidden.toLowerCase())) {
        return generateFallbackTitle();
      }
    }

    // Final validation - ensure it's not empty
    if (!title || title.length < 3) {
      return generateFallbackTitle();
    }

    return title;
  } catch (error) {
    console.error('Error generating conversation title:', error);
    return generateFallbackTitle();
  }
}

/**
 * Generate a safe fallback title
 */
function generateFallbackTitle(): string {
  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  const day = now.getDate();
  return `Conversation ${month} ${day}`;
}

const SOURCE_TITLE_MAX_CHARS = 60;
const SOURCE_TITLE_INPUT_CHARS = 1200;

/**
 * Generate a short, topic-style title for a source using a small LLM call.
 * Used during source ingestion. Returns null on failure so callers can fall back to heuristic.
 */
export async function generateSourceTitle(content: string): Promise<string | null> {
  console.error('[generateSourceTitle] called');
  const excerpt = (typeof content === 'string' ? content : '').trim().slice(0, SOURCE_TITLE_INPUT_CHARS);
  if (!excerpt) return null;

  const userPrompt = `Generate a concise title summarizing this source.

Rules:
3 to 7 words
Title Case
No punctuation unless necessary
Capture the main topic or decision
Avoid generic labels like "User", "Conversation", or project name
Do not repeat the first line verbatim
Return only the title.

Source:
${excerpt}`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
        // eslint-disable-next-line no-console
        console.error('[generateSourceTitle] OPENAI_API_KEY not set; using heuristic fallback for source titles.');
      }
      return null;
    }

    const response = await openaiRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.5,
        max_tokens: 30,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[generateSourceTitle] OpenAI API non-OK:', response.status, errBody.slice(0, 200));
      return null;
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() ?? '';
    title = title.replace(/^["']|["']$/g, '').trim();
    if (title.length > SOURCE_TITLE_MAX_CHARS) title = title.slice(0, SOURCE_TITLE_MAX_CHARS).trim();
    if (!title || title.length < 2) {
      console.error('[generateSourceTitle] Empty or invalid title in response');
      return null;
    }
    return title;
  } catch (err) {
    console.error('[generateSourceTitle] Error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
