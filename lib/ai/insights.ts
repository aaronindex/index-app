// lib/ai/insights.ts
/**
 * AI-powered insight extraction from conversations
 * Extracts: decisions, commitments, blockers, open loops, and suggested highlights
 */

import { openaiRequest } from './request';

interface ConversationContent {
  id: string;
  title: string | null;
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    index_in_conversation: number;
  }>;
}

export interface ExtractedInsight {
  type: 'decision' | 'commitment' | 'blocker' | 'open_loop' | 'highlight';
  content: string;
  title: string;
  message_index?: number; // For highlights, which message it came from
  confidence?: number; // 0-1 scale
  context?: string; // Additional context
}

export interface InsightExtractionResult {
  decisions: ExtractedInsight[];
  commitments: ExtractedInsight[];
  blockers: ExtractedInsight[];
  openLoops: ExtractedInsight[];
  suggestedHighlights: ExtractedInsight[];
}

/**
 * Extract insights from a conversation using LLM
 */
export async function extractInsights(
  conversation: ConversationContent
): Promise<InsightExtractionResult> {
  if (!conversation.messages || conversation.messages.length === 0) {
    return {
      decisions: [],
      commitments: [],
      blockers: [],
      openLoops: [],
      suggestedHighlights: [],
    };
  }

  // Build conversation context for LLM
  const conversationText = conversation.messages
    .map((msg, idx) => {
      const roleLabel = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'AI' : msg.role;
      return `[${idx}] ${roleLabel}: ${msg.content}`;
    })
    .join('\n\n');

  const prompt = `Analyze the following conversation and extract structured insights. Look for:

1. **Decisions**: Explicit decisions or commitments made (e.g., "Let's do X", "We'll use Y", "I've decided to...")
2. **Commitments**: Promises or commitments made (e.g., "I'll do X by Y", "I promise to...", "I'm committed to...")
3. **Blockers**: Obstacles, blockers, or problems mentioned (e.g., "I can't do X because...", "The issue is...", "We're blocked by...")
4. **Open Loops**: Unresolved questions, incomplete thoughts, or things that need follow-up (e.g., "We should figure out...", "I need to think about...", "What about...?")
5. **Suggested Highlights**: Key insights, important points, or memorable quotes worth highlighting

Conversation Title: ${conversation.title || 'Untitled'}

Conversation:
${conversationText}

Return a JSON object with this structure:
{
  "decisions": [
    {
      "type": "decision",
      "title": "Short title (max 100 chars)",
      "content": "Full decision text or quote",
      "message_index": 5,
      "confidence": 0.9,
      "context": "Additional context if needed"
    }
  ],
  "commitments": [...],
  "blockers": [...],
  "openLoops": [...],
  "suggestedHighlights": [...]
}

Be selective - only extract high-quality, actionable insights. Include message_index (0-based) to reference where in the conversation each insight came from.`;

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
          {
            role: 'system',
            content:
              'You are an expert at analyzing conversations and extracting actionable insights. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent extraction
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('[InsightExtraction] Failed to parse JSON response:', parseError);
      console.error('[InsightExtraction] Response content:', content.substring(0, 500));
      throw new Error(`Failed to parse extraction response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

    // Log extraction results for debugging
    console.log('[InsightExtraction] Extracted:', {
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.length : 0,
      commitments: Array.isArray(parsed.commitments) ? parsed.commitments.length : 0,
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers.length : 0,
      openLoops: Array.isArray(parsed.openLoops) ? parsed.openLoops.length : 0,
      suggestedHighlights: Array.isArray(parsed.suggestedHighlights) ? parsed.suggestedHighlights.length : 0,
    });

    // Validate and normalize the response
    return {
      decisions: Array.isArray(parsed.decisions)
        ? parsed.decisions.map((d: any) => ({
            type: 'decision' as const,
            title: d.title || d.content?.substring(0, 100) || 'Untitled Decision',
            content: d.content || '',
            message_index: typeof d.message_index === 'number' ? d.message_index : undefined,
            confidence: typeof d.confidence === 'number' ? Math.max(0, Math.min(1, d.confidence)) : 0.8,
            context: d.context || undefined,
          }))
        : [],
      commitments: Array.isArray(parsed.commitments)
        ? parsed.commitments.map((c: any) => ({
            type: 'commitment' as const,
            title: c.title || c.content?.substring(0, 100) || 'Untitled Commitment',
            content: c.content || '',
            message_index: typeof c.message_index === 'number' ? c.message_index : undefined,
            confidence: typeof c.confidence === 'number' ? Math.max(0, Math.min(1, c.confidence)) : 0.8,
            context: c.context || undefined,
          }))
        : [],
      blockers: Array.isArray(parsed.blockers)
        ? parsed.blockers.map((b: any) => ({
            type: 'blocker' as const,
            title: b.title || b.content?.substring(0, 100) || 'Untitled Blocker',
            content: b.content || '',
            message_index: typeof b.message_index === 'number' ? b.message_index : undefined,
            confidence: typeof b.confidence === 'number' ? Math.max(0, Math.min(1, b.confidence)) : 0.8,
            context: b.context || undefined,
          }))
        : [],
      openLoops: Array.isArray(parsed.openLoops)
        ? parsed.openLoops.map((ol: any) => ({
            type: 'open_loop' as const,
            title: ol.title || ol.content?.substring(0, 100) || 'Untitled Open Loop',
            content: ol.content || '',
            message_index: typeof ol.message_index === 'number' ? ol.message_index : undefined,
            confidence: typeof ol.confidence === 'number' ? Math.max(0, Math.min(1, ol.confidence)) : 0.8,
            context: ol.context || undefined,
          }))
        : [],
      suggestedHighlights: Array.isArray(parsed.suggestedHighlights)
        ? parsed.suggestedHighlights.map((sh: any) => ({
            type: 'highlight' as const,
            title: sh.title || sh.content?.substring(0, 100) || 'Untitled Highlight',
            content: sh.content || '',
            message_index: typeof sh.message_index === 'number' ? sh.message_index : undefined,
            confidence: typeof sh.confidence === 'number' ? Math.max(0, Math.min(1, sh.confidence)) : 0.8,
            context: sh.context || undefined,
          }))
        : [],
    };
  } catch (error) {
    console.error('[InsightExtraction] Error:', error);
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('[InsightExtraction] Error message:', error.message);
      console.error('[InsightExtraction] Error stack:', error.stack);
    }
    // Return empty result on error rather than throwing
    // This allows the UI to show "0 items" rather than crashing
    return {
      decisions: [],
      commitments: [],
      blockers: [],
      openLoops: [],
      suggestedHighlights: [],
    };
  }
}

