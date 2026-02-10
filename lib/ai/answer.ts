// lib/ai/answer.ts
/**
 * LLM-powered answer synthesis from search results
 */

import { SearchResult } from '@/lib/search';
import { THINKING_STANCE } from './stance';
import { openaiRequest } from './request';

export interface FollowUpQuestion {
  type: 'clarify' | 'decide' | 'commit' | 'deprioritize';
  text: string;
  tileType?: 'decision' | 'task' | 'clarify_task'; // Original tile type from generation
}

export interface SynthesizedAnswer {
  answer: string;
  citations: Array<{
    chunk_id: string;
    conversation_id: string;
    conversation_title: string | null;
    excerpt: string;
    similarity: number;
  }>;
  followUpQuestions: FollowUpQuestion[];
}

/**
 * Synthesize a coherent answer from search results using LLM
 */
export async function synthesizeAnswer(
  query: string,
  searchResults: SearchResult[]
): Promise<SynthesizedAnswer> {
  if (searchResults.length === 0) {
    return {
      answer: "I couldn't find any relevant information in your conversations to answer this question.",
      citations: [],
      followUpQuestions: [],
    };
  }

  // Import stance constants
  const thinkingStance = THINKING_STANCE;

  // Build context from top results (limit to top 5 for token efficiency)
  const topResults = searchResults.slice(0, 5);
  const context = topResults
    .map((result, idx) => {
      return `[Source ${idx + 1}: ${result.conversation_title || 'Untitled Conversation'}]
${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}`;
    })
    .join('\n\n');

  const prompt = `You are an intelligent assistant helping a user understand their own thinking and conversations.

THINKING STANCE:
${thinkingStance}

The user asked: "${query}"

Based on the following excerpts from their conversations, provide a SHORT, ACTION-ORIENTED answer (max 8-12 lines):

STRUCTURE:
1) What the record suggests (1-3 lines)
2) What remains unresolved (1 line, optional if truly resolved)

RULES:
- Max 8-12 lines total
- No boilerplate headers like "### Answer" or "This structured approach..."
- No numbered essay blocks unless truly necessary and still short
- Be specific and direct
- If information is incomplete, say so explicitly
- Write in a calm, decisive tone
- Prefer reduction over expansion

Conversation excerpts:
${context}

Return ONLY the answer text (no headers, no meta-commentary).`;

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
              `You are a helpful assistant that synthesizes information from a user's own conversations. Provide clear, accurate answers based on the provided context. Always cite your sources.\n\nTHINKING STANCE:\n${thinkingStance}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300, // Reduced for brevity
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content;

    if (!answer) {
      throw new Error('No answer in OpenAI response');
    }

    // Generate conversion tiles (Decision/Task/Clarify Task) - max 2
    const conversionPrompt = `Based on the user's question "${query}" and the answer provided below, generate 1-2 conversion tiles (NOT questions).

THINKING STANCE:
${thinkingStance}

Answer provided:
${answer}

CONVERSION TILE TYPES:
- "decision": A decision that needs to be made (e.g., "Choose between X and Y")
- "task": A concrete actionable next step (e.g., "Research pricing options")
- "clarify_task": Information needed to make a decision (still a Task type)

RULES:
- Maximum 2 tiles total
- Each tile must be a concrete artifact, not a question
- No open-ended exploration
- Phrase as commitments, not prompts
- Decision tiles: frame as "Decide: [what to decide]"
- Task tiles: frame as "Task: [what to do]"
- Clarify Task tiles: frame as "Get [info] needed to decide"

Return ONLY a JSON object with this exact structure:
{
  "tiles": [
    {"type": "decision", "text": "Decide: Choose between X and Y"},
    {"type": "task", "text": "Task: Research pricing options"}
  ]
}

Example: {"tiles": [{"type": "decision", "text": "Decide: Prioritize feature X or Y"}, {"type": "task", "text": "Task: Get user feedback on pricing"}]}`;

    let followUpQuestions: FollowUpQuestion[] = [];
    try {
      const conversionResponse = await openaiRequest('https://api.openai.com/v1/chat/completions', {
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
              content: `You are a helpful assistant. Return only valid JSON objects with the exact structure specified. Follow the thinking stance constraints.`,
            },
            {
              role: 'user',
              content: conversionPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (conversionResponse.ok) {
        const conversionData = await conversionResponse.json();
        const conversionContent = conversionData.choices[0]?.message?.content;
        if (conversionContent) {
          try {
            const parsed = JSON.parse(conversionContent);
            // Parse conversion tiles - map to follow-up format for compatibility
            if (parsed.tiles && Array.isArray(parsed.tiles)) {
              followUpQuestions = parsed.tiles
                .filter((t: any) => {
                  const validTypes = ['decision', 'task', 'clarify_task'];
                  return validTypes.includes(t.type) && t.text && typeof t.text === 'string';
                })
                .map((t: any) => {
                  // Map tile types to follow-up types for backward compatibility
                  let followUpType: 'clarify' | 'decide' | 'commit' | 'deprioritize' = 'commit';
                  if (t.type === 'decision') {
                    followUpType = 'decide';
                  } else if (t.type === 'task' || t.type === 'clarify_task') {
                    followUpType = 'commit';
                  }
                  return {
                    type: followUpType,
                    text: t.text,
                    tileType: t.type, // Store original tile type
                  };
                })
                .slice(0, 2); // Limit to 2 tiles
            }
          } catch (parseError) {
            console.error('Error parsing conversion tiles:', parseError);
            followUpQuestions = [];
          }
        }
      }
    } catch (conversionError) {
      console.error('Error generating conversion tiles:', conversionError);
      followUpQuestions = [];
    }

    // Build citations from search results
    const citations = topResults.map((result) => ({
      chunk_id: result.chunk_id,
      conversation_id: result.conversation_id,
      conversation_title: result.conversation_title,
      excerpt: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
      similarity: result.similarity,
    }));

    return {
      answer,
      citations,
      followUpQuestions: followUpQuestions.slice(0, 2), // Limit to 2 tiles
    };
  } catch (error) {
    console.error('Answer synthesis error:', error);
    // Fallback: return a simple summary
    return {
      answer: `Based on ${searchResults.length} relevant conversation${searchResults.length !== 1 ? 's' : ''}, here's what I found:\n\n${searchResults
        .slice(0, 3)
        .map((r, idx) => `${idx + 1}. ${r.conversation_title || 'Untitled'}: ${r.content.substring(0, 150)}...`)
        .join('\n\n')}`,
      citations: searchResults.slice(0, 5).map((result) => ({
        chunk_id: result.chunk_id,
        conversation_id: result.conversation_id,
        conversation_title: result.conversation_title,
        excerpt: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
        similarity: result.similarity,
      })),
      followUpQuestions: [],
    };
  }
}

