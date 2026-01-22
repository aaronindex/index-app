// lib/ai/title.ts
// AI-powered conversation title generation with strict constraints

import OpenAI from 'openai';

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
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    let title = response.choices[0]?.message?.content?.trim() || '';

    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '').trim();

    // Remove trailing punctuation (except : and /)
    title = title.replace(/[.,;!?]+$/, '').trim();

    // Validate and enforce constraints
    if (title.length > MAX_TITLE_LENGTH) {
      title = title.substring(0, MAX_TITLE_LENGTH).trim();
    }

    // Check word count
    const words = title.split(/\s+/).filter((w) => w.length > 0);
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
