// lib/ai/answer.ts
/**
 * LLM-powered answer synthesis from search results
 */

import { SearchResult } from '@/lib/search';

export interface SynthesizedAnswer {
  answer: string;
  citations: Array<{
    chunk_id: string;
    conversation_id: string;
    conversation_title: string | null;
    excerpt: string;
    similarity: number;
  }>;
  followUpQuestions: string[];
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

  // Build context from top results (limit to top 5 for token efficiency)
  const topResults = searchResults.slice(0, 5);
  const context = topResults
    .map((result, idx) => {
      return `[Source ${idx + 1}: ${result.conversation_title || 'Untitled Conversation'}]
${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}`;
    })
    .join('\n\n');

  const prompt = `You are an intelligent assistant helping a user understand their own thinking and conversations.

The user asked: "${query}"

Based on the following excerpts from their conversations, provide:
1. A clear, synthesized answer that directly addresses their question
2. Be specific and cite which conversations/excerpts support your answer
3. If the information is incomplete or unclear, say so
4. Write in a helpful, conversational tone as if you're summarizing their own thoughts

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
              'You are a helpful assistant that synthesizes information from a user\'s own conversations. Provide clear, accurate answers based on the provided context. Always cite your sources.',
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

    // Generate actionable follow-up questions
    // These should be prompts that can be converted into branches, tasks, decisions, or highlights
    const followUpPrompt = `Based on the user's question "${query}" and the answer provided below, generate 2-3 actionable follow-up prompts. These should be phrased as prompts the user could realistically act on, not just questions to search.

Answer provided:
${answer}

Each prompt should be:
- Actionable (could become a branch conversation, task, decision, or highlight)
- Specific to the context and answer
- Phrased as a prompt or question that invites exploration or action

Examples of good prompts:
- "What decision does this insight imply for [Project]?"
- "What assumptions might be wrong here?"
- "How should I prioritize the next steps?"
- "What are the risks I haven't considered?"

Return only a JSON object with a "questions" array of prompt strings, no other text.

Example format: {"questions": ["Prompt 1?", "Prompt 2?", "Prompt 3?"]}`;

    let followUpQuestions: string[] = [];
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
              content: 'You are a helpful assistant. Return only valid JSON arrays.',
            },
            {
              role: 'user',
              content: followUpPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 200,
        }),
      });

      if (followUpResponse.ok) {
        const followUpData = await followUpResponse.json();
        const followUpContent = followUpData.choices[0]?.message?.content;
        if (followUpContent) {
          try {
            const parsed = JSON.parse(followUpContent);
            // Handle both {questions: [...]} and [...] formats
            followUpQuestions = Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed.questions)
              ? parsed.questions
              : [];
          } catch {
            // If parsing fails, generate simple follow-ups
            followUpQuestions = [
              `Tell me more about this`,
              `What else did I discuss related to this?`,
              `What are the implications of this?`,
            ];
          }
        }
      }
    } catch (followUpError) {
      console.error('Error generating follow-up questions:', followUpError);
      // Provide default follow-ups if generation fails
      followUpQuestions = [
        `Tell me more about this`,
        `What else did I discuss related to this?`,
        `What are the implications of this?`,
      ];
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
      followUpQuestions: [
        `Tell me more about this`,
        `What else did I discuss related to this?`,
        `What are the implications of this?`,
      ],
    };
  }
}

