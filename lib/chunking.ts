// lib/chunking.ts
/**
 * Chunks text into smaller pieces for embedding.
 * Uses a simple character-based approach (roughly 500-1000 tokens ≈ 2000-4000 chars)
 */

const CHUNK_SIZE = 3000; // ~750 tokens (conservative estimate: 4 chars per token)
const OVERLAP = 200; // Overlap between chunks to maintain context

export interface Chunk {
  content: string;
  chunkIndex: number;
}

/**
 * Splits text into overlapping chunks
 */
export function chunkText(text: string): Chunk[] {
  if (!text || text.length === 0) {
    return [];
  }

  // If text is smaller than chunk size, return as single chunk
  if (text.length <= CHUNK_SIZE) {
    return [{ content: text.trim(), chunkIndex: 0 }];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;

    // If not the last chunk, try to break at a sentence boundary
    if (end < text.length) {
      // Look for sentence endings (., !, ?) or paragraph breaks
      const sentenceEnd = Math.max(
        text.lastIndexOf('.', end),
        text.lastIndexOf('!', end),
        text.lastIndexOf('?', end),
        text.lastIndexOf('\n\n', end)
      );

      // If we found a good break point within the last 20% of the chunk, use it
      if (sentenceEnd > start + CHUNK_SIZE * 0.8) {
        end = sentenceEnd + 1;
      } else {
        // Otherwise, try to break at word boundary
        const wordEnd = text.lastIndexOf(' ', end);
        if (wordEnd > start + CHUNK_SIZE * 0.8) {
          end = wordEnd;
        }
      }
    }

    const chunkContent = text.slice(start, end).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        chunkIndex,
      });
      chunkIndex++;
    }

    // Move start position with overlap
    start = end - OVERLAP;
    if (start < 0) start = 0;
  }

  return chunks;
}

