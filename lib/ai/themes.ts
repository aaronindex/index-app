// lib/ai/themes.ts
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { embedText } from './embeddings';

export interface ThemeCluster {
  themeId: string;
  name: string;
  description: string;
  conversationIds: string[];
  weight: number;
}

/**
 * Cluster conversations into themes using vector similarity
 */
export async function clusterConversationsIntoThemes(
  userId: string,
  conversationIds: string[],
  minClusterSize = 2
): Promise<ThemeCluster[]> {
  const supabase = await getSupabaseServerClient();

  if (conversationIds.length < minClusterSize) {
    return [];
  }

  // Get conversation embeddings (use average of message chunk embeddings)
  const { data: chunks } = await supabase
    .from('message_chunks')
    .select('conversation_id, content')
    .in('conversation_id', conversationIds)
    .eq('user_id', userId)
    .limit(1000); // Limit for performance

  if (!chunks || chunks.length === 0) {
    console.warn(`[Theme Clustering] No message chunks found for ${conversationIds.length} conversations. Trying fallback: grouping by tags.`);
    
    // Fallback: Group conversations by shared tags
    const { data: conversationTags } = await supabase
      .from('conversation_tags')
      .select('conversation_id, tag_id, tags(name)')
      .in('conversation_id', conversationIds);
    
    if (!conversationTags || conversationTags.length === 0) {
      console.warn(`[Theme Clustering] No tags found either. Trying final fallback: simple grouping by conversation titles.`);
      
      // Final fallback: Group by conversation title similarity (simple string matching)
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, title')
        .in('id', conversationIds)
        .eq('user_id', userId);
      
      if (!conversations || conversations.length < minClusterSize) {
        console.warn(`[Theme Clustering] Not enough conversations for clustering.`);
        // Even if not enough for minClusterSize, create one theme with all conversations
        if (conversations && conversations.length > 0) {
          return [{
            themeId: conversations[0].id,
            name: conversations[0].title || 'Untitled Theme',
            description: `Group of ${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`,
            conversationIds: conversations.map((c: any) => c.id),
            weight: 1.0,
          }];
        }
        return [];
      }
      
      // Simple grouping: conversations with similar titles (first 3 words)
      const titleGroups = new Map<string, string[]>();
      conversations.forEach((conv: any) => {
        const title = conv.title || 'Untitled';
        const key = title.split(' ').slice(0, 3).join(' ').toLowerCase();
        if (!titleGroups.has(key)) {
          titleGroups.set(key, []);
        }
        titleGroups.get(key)!.push(conv.id);
      });
      
      const themes: ThemeCluster[] = [];
      for (const [key, convIds] of titleGroups.entries()) {
        if (convIds.length >= minClusterSize) {
          const uniqueConvIds = [...new Set(convIds)];
          themes.push({
            themeId: uniqueConvIds[0],
            name: conversations.find((c: any) => c.id === uniqueConvIds[0])?.title || key,
            description: `Grouped by title similarity: ${key}`,
            conversationIds: uniqueConvIds,
            weight: uniqueConvIds.length / conversationIds.length,
          });
        }
      }
      
      // If no title-based groups, create one theme with all conversations
      if (themes.length === 0 && conversations.length >= minClusterSize) {
        themes.push({
          themeId: conversations[0].id,
          name: conversations[0].title || 'Project Conversations',
          description: `All ${conversations.length} conversations in this project`,
          conversationIds: conversations.map((c: any) => c.id),
          weight: 1.0,
        });
      }
      
      console.log(`[Theme Clustering] Created ${themes.length} themes from title groups`);
      return themes;
    }
    
    // Group conversations by shared tags
    const tagGroups = new Map<string, string[]>();
    conversationTags.forEach((ct: any) => {
      const tagName = ct.tags?.name || 'untagged';
      if (!tagGroups.has(tagName)) {
        tagGroups.set(tagName, []);
      }
      tagGroups.get(tagName)!.push(ct.conversation_id);
    });
    
    // Create themes from tag groups with at least minClusterSize conversations
    const themes: ThemeCluster[] = [];
    for (const [tagName, convIds] of tagGroups.entries()) {
      if (convIds.length >= minClusterSize) {
        const uniqueConvIds = [...new Set(convIds)];
        themes.push({
          themeId: uniqueConvIds[0],
          name: tagName,
          description: `Grouped by tag: ${tagName}`,
          conversationIds: uniqueConvIds,
          weight: uniqueConvIds.length / conversationIds.length,
        });
      }
    }
    
    // If no tag-based groups, create one theme with all conversations
    if (themes.length === 0 && conversationIds.length >= minClusterSize) {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, title')
        .in('id', conversationIds)
        .eq('user_id', userId)
        .limit(1);
      
      themes.push({
        themeId: conversationIds[0],
        name: conversations?.[0]?.title || 'Project Conversations',
        description: `All ${conversationIds.length} conversations in this project`,
        conversationIds: conversationIds,
        weight: 1.0,
      });
    }
    
    console.log(`[Theme Clustering] Created ${themes.length} themes from tag groups`);
    return themes;
  }

  console.log(`[Theme Clustering] Found ${chunks.length} chunks for ${conversationIds.length} conversations`);

  // Group chunks by conversation
  const conversationChunks = new Map<string, string[]>();
  for (const chunk of chunks) {
    if (!conversationChunks.has(chunk.conversation_id)) {
      conversationChunks.set(chunk.conversation_id, []);
    }
    conversationChunks.get(chunk.conversation_id)!.push(chunk.content);
  }

  // Generate embeddings for each conversation (average of chunks)
  const conversationEmbeddings = new Map<string, number[]>();
  for (const [convId, chunkTexts] of conversationChunks.entries()) {
    // Combine chunks for this conversation
    const combinedText = chunkTexts.join('\n\n').substring(0, 8000);
    const embedding = await embedText(combinedText);
    conversationEmbeddings.set(convId, embedding);
  }

  // Simple clustering: group conversations with high cosine similarity
  const clusters: Map<string, string[]> = new Map();
  const processed = new Set<string>();

  for (const [convId1, emb1] of conversationEmbeddings.entries()) {
    if (processed.has(convId1)) continue;

    const cluster: string[] = [convId1];
    processed.add(convId1);

    for (const [convId2, emb2] of conversationEmbeddings.entries()) {
      if (convId1 === convId2 || processed.has(convId2)) continue;

      const similarity = cosineSimilarity(emb1, emb2);
      if (similarity > 0.5) {
        // Similarity threshold (lowered to 0.5 to catch more clusters)
        cluster.push(convId2);
        processed.add(convId2);
      }
    }

    if (cluster.length >= minClusterSize) {
      clusters.set(convId1, cluster);
      console.log(`[Theme Clustering] Created cluster with ${cluster.length} conversations`);
    }
  }

  console.log(`[Theme Clustering] Total clusters found: ${clusters.size}`);

  // Generate theme names and descriptions for each cluster
  const themes: ThemeCluster[] = [];
  for (const [seedConvId, clusterConvIds] of clusters.entries()) {
    // Get conversation titles for theme naming
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, title')
      .in('id', clusterConvIds)
      .eq('user_id', userId);

    const titles = conversations?.map((c) => c.title || 'Untitled').join(', ') || '';

    // Simple theme name from first conversation title or generate from tags
    const themeName = conversations?.[0]?.title || `Theme ${themes.length + 1}`;
    const themeDescription = `Cluster of ${clusterConvIds.length} related conversations: ${titles.substring(0, 200)}`;

    themes.push({
      themeId: seedConvId, // Use seed conversation ID as theme ID
      name: themeName,
      description: themeDescription,
      conversationIds: clusterConvIds,
      weight: clusterConvIds.length / conversationIds.length, // Normalized weight
    });
  }

  return themes;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

