// lib/ai/request.ts
/**
 * OpenAI API request wrapper with timeout support
 */

const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '25000', 10);
const OPENAI_EMBED_TIMEOUT_MS = parseInt(process.env.OPENAI_EMBED_TIMEOUT_MS || '30000', 10);

/**
 * Make an OpenAI API request with timeout
 */
export async function openaiRequest(
  url: string,
  options: RequestInit,
  timeoutMs: number = OPENAI_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`OpenAI API request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Make an OpenAI embeddings request with timeout
 */
export async function openaiEmbeddingRequest(
  url: string,
  options: RequestInit
): Promise<Response> {
  return openaiRequest(url, options, OPENAI_EMBED_TIMEOUT_MS);
}
