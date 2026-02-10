// lib/ai/embeddings.ts
/**
 * OpenAI embeddings helper
 */

import { openaiEmbeddingRequest } from './request';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, cost-effective

if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set. Embeddings will fail.');
}

/**
 * Generates an embedding vector for the given text using OpenAI
 * @param text The text to embed
 * @returns A vector of numbers (1536 dimensions for text-embedding-3-small)
 */
export async function embedText(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    const response = await openaiEmbeddingRequest('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: text.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`
      );
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.data[0].embedding;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generates embeddings for multiple texts in batch
 * @param texts Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (texts.length === 0) {
    return [];
  }

  // Filter out empty texts
  const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  
  if (validTexts.length === 0) {
    throw new Error('No valid texts to embed');
  }

  try {
    const response = await openaiEmbeddingRequest('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: validTexts,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`
      );
    }

    const data = await response.json();
    
    if (!data.data || data.data.length !== validTexts.length) {
      throw new Error('Invalid response from OpenAI API: mismatched batch size');
    }

    return data.data.map((item: { embedding: number[] }) => item.embedding);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate embeddings');
  }
}

