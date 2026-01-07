// lib/ai/answer.ts
/**
 * LLM-powered answer synthesis from search results
 */

import { SearchResult } from '@/lib/search';
import { THINKING_STANCE } from './stance';

export interface FollowUpQuestion {
  type: 'clarify' | 'decide' | 'commit' | 'deprioritize';
  text: string;
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

Based on the following excerpts from their conversations, provide:
1. A clear, synthesized answer that directly addresses their question
2. Be specific and cite which conversations/excerpts support your answer
3. If the information is incomplete or unclear, say so explicitly rather than expanding scope
4. Write in a structured, calm, decisive tone
5. Prefer reduction over expansion

Conversation excerpts:
${context}

Provide your answer in a clear, well-structured format. Be concise but thorough.`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        max_tokens: 1000,
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

    // Generate constrained follow-up questions using taxonomy
    // Follow-ups must be one of: clarify, decide, commit, deprioritize
    const followUpPrompt = `Based on the user's question "${query}" and the answer provided below, generate 2-4 follow-up prompts using ONLY these categories:

THINKING STANCE:
${thinkingStance}

Answer provided:
${answer}

FOLLOW-UP TAXONOMY (choose one type per prompt):
- "clarify": Questions that seek to resolve uncertainty or ambiguity
- "decide": Questions that require a decision between options
- "commit": Questions that lead to concrete next actions or commitments
- "deprioritize": Questions that help identify what can be set aside

RULES:
- No brainstorming or exploration prompts
- No open-ended "what else?" questions
- Each prompt must be phrased to convert cleanly into a Task or Decision
- Maximum 4 follow-ups total

Return ONLY a JSON object with this exact structure:
{
  "followUps": [
    {"type": "clarify", "text": "What specific uncertainty needs resolution?"},
    {"type": "decide", "text": "What decision does this require?"},
    {"type": "commit", "text": "What concrete action should be taken?"},
    {"type": "deprioritize", "text": "What can be set aside?"}
  ]
}

Example format: {"followUps": [{"type": "decide", "text": "Should I prioritize X or Y?"}, {"type": "commit", "text": "What are the next 3 concrete steps?"}]}`;

    let followUpQuestions: FollowUpQuestion[] = [];
    try {
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: followUpPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const followUpContent = followUpData.choices[0]?.message?.content;
        if (followUpContent) {
          try {
            const parsed = JSON.parse(followUpContent);
            // Parse follow-ups with type and text
            if (parsed.followUps && Array.isArray(parsed.followUps)) {
              followUpQuestions = parsed.followUps
                .filter((f: any) => {
                  // Validate type is one of the allowed values
                  const validTypes = ['clarify', 'decide', 'commit', 'deprioritize'];
                  return validTypes.includes(f.type) && f.text && typeof f.text === 'string';
                })
                .map((f: any) => ({
                  type: f.type as 'clarify' | 'decide' | 'commit' | 'deprioritize',
                  text: f.text,
                }))
                .slice(0, 4); // Limit to 4
            }
          } catch (parseError) {
            console.error('Error parsing follow-up questions:', parseError);
            // Fallback: provide empty array (no follow-ups if parsing fails)
            followUpQuestions = [];
          }
        }
      }
    } catch (followUpError) {
      console.error('Error generating follow-up questions:', followUpError);
      // Fallback: provide empty array (no follow-ups if generation fails)
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
      followUpQuestions: followUpQuestions.slice(0, 4), // Limit to 4
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

