// lib/search.ts
/**
 * Vector similarity search using pgvector
 */

import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { embedText } from './ai/embeddings';

export interface SearchResult {
  chunk_id: string;
  content: string;
  conversation_id: string;
  conversation_title: string | null;
  message_id: string;
  similarity: number;
}

/**
 * Searches for similar chunks using vector similarity
 * @param query The search query text
 * @param userId The user ID to scope the search
 * @param limit Maximum number of results to return
 * @param similarityThreshold Minimum similarity score (0-1)
 * @param projectId Optional project ID to scope search to a project
 * @returns Array of search results sorted by similarity
 */
export async function searchChunks(
  query: string,
  userId: string,
  limit: number = 10,
  similarityThreshold: number = 0.5,
  projectId?: string
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  console.log('[Search] Starting search for user:', userId);
  console.log('[Search] Query:', query.substring(0, 50));

  // Generate embedding for the query
  console.log('[Search] Generating query embedding...');
  const queryEmbedding = await embedText(query.trim());
  console.log('[Search] Query embedding generated, length:', queryEmbedding.length);

  const supabase = await getSupabaseServerClient();

  // Try using the RPC function first (if it exists)
  // Note: Supabase should handle array-to-vector conversion automatically
  const { data: rpcData, error: rpcError } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: similarityThreshold,
    match_count: limit,
    user_id: userId,
    project_id: projectId || null,
  });

  // If RPC exists and works, use it
  if (!rpcError && rpcData) {
    console.log('[Search] RPC function returned', rpcData.length, 'results');
    return rpcData.map((row: any) => ({
      chunk_id: row.chunk_id,
      content: row.content,
      conversation_id: row.conversation_id,
      conversation_title: row.conversation_title,
      message_id: row.message_id,
      similarity: row.similarity || 0,
    }));
  }

  // Log RPC error for debugging (but don't fail - use fallback)
  if (rpcError) {
    console.log('[Search] RPC function error, using fallback:', rpcError.message, rpcError.code);
  }

  // Fallback: Get chunks with embeddings separately and compute similarity client-side
  // This is less efficient but works without a database function
  
  // First, get conversation IDs if filtering by project
  let conversationIds: string[] | undefined = undefined;
  if (projectId) {
    const { data: projectConvs } = await supabase
      .from('project_conversations')
      .select('conversation_id')
      .eq('project_id', projectId);
    
    if (projectConvs && projectConvs.length > 0) {
      conversationIds = projectConvs.map((pc) => pc.conversation_id);
    } else {
      // No conversations in this project, return empty
      return [];
    }
  }
  
  // Get chunks for the user
  let chunksQuery = supabase
    .from('message_chunks')
    .select(`
      id,
      content,
      conversation_id,
      message_id,
      conversations!inner(id, title, user_id)
    `)
    .eq('user_id', userId)
    .eq('conversations.user_id', userId);

  if (conversationIds) {
    chunksQuery = chunksQuery.in('conversation_id', conversationIds);
  }

  const { data: chunks, error: chunksError } = await chunksQuery.limit(500);

  console.log('[Search] Chunks query result:', {
    chunksFound: chunks?.length || 0,
    error: chunksError?.message,
  });

  if (chunksError || !chunks || chunks.length === 0) {
    console.log('[Search] No chunks found:', chunksError?.message || 'No chunks available');
    return [];
  }

  // Get embeddings for these chunks
  const chunkIds = chunks.map((c) => c.id);
  console.log('[Search] Fetching embeddings for', chunkIds.length, 'chunks');
  
  const { data: embeddings, error: embeddingsError } = await supabase
    .from('message_chunk_embeddings')
    .select('chunk_id, embedding')
    .in('chunk_id', chunkIds);

  console.log('[Search] Embeddings query result:', {
    embeddingsFound: embeddings?.length || 0,
    error: embeddingsError?.message,
  });

  if (embeddingsError) {
    console.error('[Search] Error fetching embeddings:', embeddingsError);
    throw new Error(`Search failed: ${embeddingsError.message}`);
  }

  if (!embeddings || embeddings.length === 0) {
    console.log('[Search] No embeddings found for chunks. Total chunks:', chunks.length);
    return [];
  }

  console.log(`[Search] Found ${embeddings.length} embeddings for ${chunks.length} chunks`);

  // Create a map of chunk_id -> embedding
  const embeddingMap = new Map<string, number[]>();
  for (const emb of embeddings) {
    // Handle different embedding formats
    let embeddingArray: number[] | null = null;
    
    if (Array.isArray(emb.embedding)) {
      embeddingArray = emb.embedding;
    } else if (typeof emb.embedding === 'string') {
      // If stored as string, parse it
      try {
        embeddingArray = JSON.parse(emb.embedding);
      } catch {
        // Try parsing as PostgreSQL array format
        const cleaned = emb.embedding.replace(/[{}]/g, '');
        embeddingArray = cleaned.split(',').map(Number);
      }
    } else if (emb.embedding && typeof emb.embedding === 'object') {
      // Might be a vector type object
      if (process.env.NODE_ENV === 'development') {
        console.log('[Search] Unexpected embedding format:', typeof emb.embedding, Object.keys(emb.embedding));
      }
      continue;
    }
    
    if (embeddingArray && Array.isArray(embeddingArray) && embeddingArray.length > 0) {
      if (embeddingArray.length !== queryEmbedding.length) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Search] Embedding dimension mismatch: expected ${queryEmbedding.length}, got ${embeddingArray.length}`);
        }
        continue;
      }
      embeddingMap.set(emb.chunk_id, embeddingArray);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[Search] Could not parse embedding for chunk:', emb.chunk_id);
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Search] Mapped ${embeddingMap.size} embeddings for similarity computation`);
  }

  // Filter chunks that have embeddings and compute similarity
  const results: Array<SearchResult & { rawSimilarity: number }> = [];

  for (const chunk of chunks) {
    const embedding = embeddingMap.get(chunk.id);
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      continue;
    }

    // Compute cosine similarity
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    
    if (similarity >= similarityThreshold) {
      results.push({
        chunk_id: chunk.id,
        content: chunk.content,
        conversation_id: chunk.conversation_id,
        conversation_title: (chunk as any).conversations?.title || null,
        message_id: chunk.message_id,
        similarity,
        rawSimilarity: similarity,
      });
    }
  }

  // Sort by similarity and limit
  results.sort((a, b) => b.similarity - a.similarity);
  
  const finalResults = results.slice(0, limit).map(({ rawSimilarity, ...result }) => result);
  
  console.log('[Search] Final results:', {
    totalComputed: results.length,
    afterThreshold: results.filter(r => r.similarity >= similarityThreshold).length,
    finalReturned: finalResults.length,
    topSimilarity: results[0]?.similarity || 0,
  });
  
  return finalResults;
}

/**
 * Search with fallback threshold
 * If no results at primary threshold, retry with lower threshold
 */
export async function searchChunksWithFallback(
  query: string,
  userId: string,
  limit: number = 10,
  primaryThreshold: number = 0.5,
  fallbackThreshold: number = 0.4,
  projectId?: string
): Promise<{ results: SearchResult[]; thresholdUsed: number; usedFallback: boolean }> {
  const primaryResults = await searchChunks(query, userId, limit, primaryThreshold, projectId);
  
  if (primaryResults.length > 0) {
    return {
      results: primaryResults,
      thresholdUsed: primaryThreshold,
      usedFallback: false,
    };
  }
  
  // Fallback: retry with lower threshold
  console.log(`[Search] No results at threshold ${primaryThreshold}, retrying with ${fallbackThreshold}`);
  const fallbackResults = await searchChunks(query, userId, limit, fallbackThreshold, projectId);
  
  return {
    results: fallbackResults,
    thresholdUsed: fallbackThreshold,
    usedFallback: true,
  };
}

/**
 * Computes cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

