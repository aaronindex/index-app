// lib/ai/tagging.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ExtractedTag {
  name: string;
  category: 'entity' | 'topic' | 'person' | 'project' | 'technology' | 'concept';
  confidence?: number;
}

export interface TaggingResult {
  tags: ExtractedTag[];
  suggestedProjectName?: string;
  suggestedProjectDescription?: string;
}

/**
 * Extract semantic tags from conversation content using LLM
 */
export async function extractTagsFromConversation(
  title: string | null,
  messages: Array<{ role: string; content: string }>
): Promise<TaggingResult> {
  // Combine conversation content for analysis
  const conversationText = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n\n')
    .substring(0, 8000); // Limit to avoid token limits

  const titleText = title || 'Untitled Conversation';

  const prompt = `Analyze the following conversation and extract semantic tags. Focus on:
- Entities: Specific things mentioned (products, companies, tools, etc.)
- Topics: Main subjects discussed
- People: Names of individuals mentioned
- Projects: Potential project names or work initiatives
- Technologies: Technologies, frameworks, languages mentioned
- Concepts: Abstract ideas or methodologies

Conversation Title: ${titleText}

Conversation Content:
${conversationText}

Return a JSON object with:
{
  "tags": [
    {"name": "tag name", "category": "entity|topic|person|project|technology|concept", "confidence": 0.0-1.0}
  ],
  "suggestedProjectName": "optional project name if this seems like a distinct project",
  "suggestedProjectDescription": "optional brief description"
}

Extract 5-15 relevant tags. Be specific and avoid generic terms.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a semantic tagging assistant. Extract meaningful tags from conversations. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content) as {
      tags?: Array<{ name: string; category: string; confidence?: number }>;
      suggestedProjectName?: string;
      suggestedProjectDescription?: string;
    };

    const tags: ExtractedTag[] = (result.tags || []).map((tag) => ({
      name: tag.name.trim(),
      category: tag.category as ExtractedTag['category'],
      confidence: tag.confidence || 0.7,
    }));

    return {
      tags,
      suggestedProjectName: result.suggestedProjectName?.trim(),
      suggestedProjectDescription: result.suggestedProjectDescription?.trim(),
    };
  } catch (error) {
    console.error('Error extracting tags:', error);
    // Return empty result on error
    return {
      tags: [],
    };
  }
}

/**
 * Batch extract tags from multiple conversations (for efficiency)
 */
export async function extractTagsFromConversations(
  conversations: Array<{
    id: string;
    title: string | null;
    messages: Array<{ role: string; content: string }>;
  }>
): Promise<Map<string, TaggingResult>> {
  const results = new Map<string, TaggingResult>();

  // Process in parallel batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < conversations.length; i += batchSize) {
    const batch = conversations.slice(i, i + batchSize);
    const batchPromises = batch.map(async (conv) => {
      const result = await extractTagsFromConversation(conv.title, conv.messages);
      results.set(conv.id, result);
    });

    await Promise.all(batchPromises);
  }

  return results;
}

