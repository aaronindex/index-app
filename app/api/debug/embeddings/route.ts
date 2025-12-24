// app/api/debug/embeddings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Get a sample chunk with its embedding
    const { data: chunk, error: chunkError } = await supabase
      .from('message_chunks')
      .select('id, content, conversation_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (chunkError || !chunk) {
      return NextResponse.json({
        error: 'No chunks found',
        details: chunkError?.message,
      });
    }

    // Get the embedding for this chunk
    const { data: embedding, error: embeddingError } = await supabase
      .from('message_chunk_embeddings')
      .select('chunk_id, embedding')
      .eq('chunk_id', chunk.id)
      .single();

    return NextResponse.json({
      chunk: {
        id: chunk.id,
        content: chunk.content.substring(0, 100) + '...',
        conversation_id: chunk.conversation_id,
      },
      embedding: embedding
        ? {
            chunk_id: embedding.chunk_id,
            embedding_type: typeof embedding.embedding,
            embedding_is_array: Array.isArray(embedding.embedding),
            embedding_length: Array.isArray(embedding.embedding)
              ? embedding.embedding.length
              : 'N/A',
            embedding_sample: Array.isArray(embedding.embedding)
              ? embedding.embedding.slice(0, 5)
              : String(embedding.embedding).substring(0, 100),
          }
        : null,
      embeddingError: embeddingError?.message,
      stats: {
        total_chunks: (
          await supabase
            .from('message_chunks')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
        ).count || 0,
        total_embeddings: (
          await supabase
            .from('message_chunk_embeddings')
            .select('chunk_id', { count: 'exact', head: true })
        ).count || 0,
      },
    });
  } catch (error) {
    console.error('Debug embeddings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    );
  }
}

