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

/** Dev-only: why reduce produced 0 items */
export interface ReduceDebug {
  inputChars: number;
  extractedTextChars: number;
  modelOutputChars: number;
  parsedItemsCount: number;
  cause?: 'no_usable_text' | 'model_empty_response' | 'model_returned_nothing' | 'parse_failed' | 'error';
  errorMessage?: string;
  roleDetectionFailed?: boolean;
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
 * Extract insights from a conversation using LLM.
 * In development with options.includeDebug, returns { result, debug } so the caller can log why 0 items.
 */
export async function extractInsights(
  conversation: ConversationContent,
  options?: { includeDebug?: boolean }
): Promise<InsightExtractionResult | { result: InsightExtractionResult; debug: ReduceDebug }> {
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
  const includeDebug = isDev && options?.includeDebug === true;

  if (!conversation.messages || conversation.messages.length === 0) {
    const debug: ReduceDebug = {
      inputChars: 0,
      extractedTextChars: 0,
      modelOutputChars: 0,
      parsedItemsCount: 0,
      cause: 'no_usable_text',
      roleDetectionFailed: true,
    };
    if (includeDebug) {
      console.log('[reduce_debug]', JSON.stringify(debug));
    }
    const empty: InsightExtractionResult = {
      decisions: [],
      commitments: [],
      blockers: [],
      openLoops: [],
      suggestedHighlights: [],
    };
    return includeDebug ? { result: empty, debug } : empty;
  }

  // Build conversation context for LLM
  const conversationText = conversation.messages
    .map((msg, idx) => {
      const roleLabel = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'AI' : msg.role;
      return `[${idx}] ${roleLabel}: ${msg.content}`;
    })
    .join('\n\n');

  const inputChars = conversation.messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
  const extractedTextChars = conversationText.length;

  const prompt = `Analyze the following conversation and extract a small set of structured signals.

INDEX is a structural ledger for thinking.
Extract only signals that create downstream consequences.

The two primary signal types are:
- Decisions: settled choices, chosen direction, or explicit commitments to a path
- Commitments: required work that must happen to move the plan forward

Be selective, but do not omit real required work just to stay sparse.

If the conversation contains launch requirements, implementation steps, next steps, remaining work, or things that must be included, extract them as commitments.

1) Decisions
- Only explicit decisions / settled choices / commitments to a direction (e.g., "We will do X", "I'm choosing Y", "We're not doing Z").
- Prefer fewer, clearer decisions over many small ones.

2) Commitments
- A conversation can contain multiple commitments even if no one says "I will do X."
- Treat these as commitments when they imply required work:
  - launch should include
  - needs to include
  - must have
  - required for launch
  - next steps
  - remaining work
  - implementation steps
  - operational preparation
- Do not leave commitments empty if the conversation clearly identifies required work.
- Do NOT create tasks from speculation, ideas that lack clear execution intent, or items that duplicate an existing decision.

3) Blockers
- ONLY include blockers that materially prevent a decision or commitment from progressing.
- Do not list generic concerns.

4) Open Loops
- ONLY include unresolved items that are decision-critical (the answer would change a decision or unblock a commitment).
- Do NOT include casual questions, musings, or general "we should think about…" items.

5) Suggested Highlights
- Extract only the most memorable / structurally meaningful nuggets (max 3).
- Prefer lines that clarify direction, constraints, or key realizations.
- Avoid "interesting" quotes that don't change understanding.

Conversation Title: ${conversation.title || 'Untitled'}

Conversation:
${conversationText}

Return a JSON object with exactly this structure:
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
  "suggestedHighlights": [
    { "title": "Short label for the highlight", "content": "Full quote or insight", "message_index": 3, "confidence": 0.9 }
  ]
}

Selection rules:
- Aim for sparsity on decisions and highlights; commitments can be 0–4 when the conversation lists clear required work (e.g. launch checklist, next steps).
- In typical cases: 0–2 decisions, 0–4 commitments, 0–1 blockers, 0–1 openLoops, 0–3 highlights.
- Never invent items that are not clearly supported by the text.
- Include message_index (0-based) for each item.

Use a decision when the conversation settles direction.
Use a commitment when the conversation identifies work that must be done.`;

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
    const modelOutputChars = typeof content === 'string' ? content.length : 0;

    if (!content) {
      const debug: ReduceDebug = {
        inputChars,
        extractedTextChars,
        modelOutputChars: 0,
        parsedItemsCount: 0,
        cause: 'model_empty_response',
      };
      if (includeDebug) console.log('[reduce_debug]', JSON.stringify(debug));
      throw new Error('No content in OpenAI response');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      const debug: ReduceDebug = {
        inputChars,
        extractedTextChars,
        modelOutputChars,
        parsedItemsCount: 0,
        cause: 'parse_failed',
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
      };
      if (includeDebug) console.log('[reduce_debug]', JSON.stringify(debug));
      console.error('[InsightExtraction] Failed to parse JSON response:', parseError);
      console.error('[InsightExtraction] Response content:', content.substring(0, 500));
      throw new Error(`Failed to parse extraction response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

    const parsedDecisions = Array.isArray(parsed.decisions) ? parsed.decisions.length : 0;
    const parsedCommitments = Array.isArray(parsed.commitments) ? parsed.commitments.length : 0;
    const parsedBlockers = Array.isArray(parsed.blockers) ? parsed.blockers.length : 0;
    const parsedOpenLoops = Array.isArray(parsed.openLoops) ? parsed.openLoops.length : 0;
    const parsedHighlights = Array.isArray(parsed.suggestedHighlights) ? parsed.suggestedHighlights.length : 0;
    const parsedItemsCount =
      parsedDecisions + parsedCommitments + parsedBlockers + parsedOpenLoops + parsedHighlights;

    // Log extraction results for debugging
    console.log('[InsightExtraction] Extracted:', {
      decisions: parsedDecisions,
      commitments: parsedCommitments,
      blockers: parsedBlockers,
      openLoops: parsedOpenLoops,
      suggestedHighlights: parsedHighlights,
    });
    // Debug: verify model returned expected keys (e.g. openLoops vs open_loops)
    if (isDev) {
      console.log('[InsightExtraction] Parsed top-level keys:', Object.keys(parsed));
    }

    if (includeDebug && parsedItemsCount === 0) {
      const debug: ReduceDebug = {
        inputChars,
        extractedTextChars,
        modelOutputChars,
        parsedItemsCount: 0,
        cause: 'model_returned_nothing',
      };
      console.log('[reduce_debug]', JSON.stringify(debug));
    }

    // Validate and normalize the response
    const result: InsightExtractionResult = {
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
        ? parsed.suggestedHighlights.map((sh: any) => {
            const rawContent = sh.content ?? sh.text ?? '';
            const rawTitle = sh.title ?? sh.label ?? sh.summary ?? '';
            // Prefer explicit title/label; otherwise use first 60 chars of content so we don't get "Untitled Highlight"
            const title =
              rawTitle.trim() ||
              (typeof rawContent === 'string' && rawContent.trim()
                ? rawContent.trim().substring(0, 60).replace(/\n/g, ' ')
                : 'Untitled Highlight');
            return {
              type: 'highlight' as const,
              title,
              content: typeof rawContent === 'string' ? rawContent : '',
              message_index: typeof sh.message_index === 'number' ? sh.message_index : undefined,
              confidence: typeof sh.confidence === 'number' ? Math.max(0, Math.min(1, sh.confidence)) : 0.8,
              context: sh.context || undefined,
            };
          })
        : [],
    };

    if (includeDebug) {
      const debug: ReduceDebug = {
        inputChars,
        extractedTextChars,
        modelOutputChars,
        parsedItemsCount,
      };
      return { result, debug };
    }
    return result;
  } catch (error) {
    console.error('[InsightExtraction] Error:', error);
    if (error instanceof Error) {
      console.error('[InsightExtraction] Error message:', error.message);
      console.error('[InsightExtraction] Error stack:', error.stack);
    }
    // Return empty result on error (and optional debug when includeDebug)
    const empty: InsightExtractionResult = {
      decisions: [],
      commitments: [],
      blockers: [],
      openLoops: [],
      suggestedHighlights: [],
    };
    if (includeDebug) {
      const debug: ReduceDebug = {
        inputChars: conversation.messages?.reduce((s, m) => s + (m.content?.length ?? 0), 0) ?? 0,
        extractedTextChars: 0,
        modelOutputChars: 0,
        parsedItemsCount: 0,
        cause: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      console.log('[reduce_debug]', JSON.stringify(debug));
      return { result: empty, debug };
    }
    return empty;
  }
}

