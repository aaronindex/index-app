-- Create RPC function for vector similarity search
-- This function uses pgvector's cosine distance operator (<=>)

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid,
  project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  content text,
  conversation_id uuid,
  conversation_title text,
  message_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id as chunk_id,
    mc.content,
    mc.conversation_id,
    c.title as conversation_title,
    mc.message_id,
    1 - (mce.embedding <=> query_embedding) as similarity
  FROM message_chunk_embeddings mce
  JOIN message_chunks mc ON mce.chunk_id = mc.id
  JOIN conversations c ON mc.conversation_id = c.id
  WHERE mc.user_id = match_chunks.user_id
    AND (1 - (mce.embedding <=> query_embedding)) >= match_threshold
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM project_conversations pc
        WHERE pc.conversation_id = mc.conversation_id
        AND pc.project_id = match_chunks.project_id
      )
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

