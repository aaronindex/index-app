// lib/relatedContent.ts
/**
 * Fetch related content (highlights, threads, projects) for search results
 */

import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { SearchResult } from './search';

export interface RelatedContent {
  highlights: Array<{
    id: string;
    content: string;
    label: string | null;
    conversation_id: string;
    conversation_title: string | null;
  }>;
  threads: Array<{
    id: string;
    title: string | null;
    conversation_id: string;
    conversation_title: string | null;
    is_branch: boolean;
  }>;
  projects: Array<{
    id: string;
    name: string;
    conversation_ids: string[];
  }>;
}

/**
 * Get related content for search results
 */
export async function getRelatedContent(
  userId: string,
  searchResults: SearchResult[]
): Promise<RelatedContent> {
  if (searchResults.length === 0) {
    return { highlights: [], threads: [], projects: [] };
  }

  const supabase = await getSupabaseServerClient();
  const conversationIds = [...new Set(searchResults.map((r) => r.conversation_id))];

  // Get highlights from these conversations
  const { data: highlights } = await supabase
    .from('highlights')
    .select('id, content, label, conversation_id')
    .in('conversation_id', conversationIds)
    .eq('user_id', userId)
    .limit(10)
    .order('created_at', { ascending: false });

  // Get conversation titles for highlights
  const highlightConversationIds = highlights?.map((h) => h.conversation_id) || [];
  const conversationMap = new Map<string, string | null>();
  if (highlightConversationIds.length > 0) {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, title')
      .in('id', highlightConversationIds);
    conversations?.forEach((c) => conversationMap.set(c.id, c.title));
  }

  // Get related threads (branches from these conversations)
  const { data: branches } = await supabase
    .from('conversations')
    .select('id, title, parent_conversation_id')
    .in('parent_conversation_id', conversationIds)
    .eq('user_id', userId)
    .limit(10);

  // Get parent conversation titles for branches
  const parentIds = branches?.map((b) => b.parent_conversation_id).filter(Boolean) || [];
  if (parentIds.length > 0) {
    const { data: parentConversations } = await supabase
      .from('conversations')
      .select('id, title')
      .in('id', parentIds);
    parentConversations?.forEach((c) => conversationMap.set(c.id, c.title));
  }

  // Get projects containing these conversations
  const { data: projectLinks } = await supabase
    .from('project_conversations')
    .select('project_id, conversation_id')
    .in('conversation_id', conversationIds);

  const projectIds = [...new Set(projectLinks?.map((pl) => pl.project_id) || [])];
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds)
    .eq('user_id', userId);

  // Group conversations by project
  const projectConversationMap = new Map<string, string[]>();
  projectLinks?.forEach((pl) => {
    const existing = projectConversationMap.get(pl.project_id) || [];
    if (!existing.includes(pl.conversation_id)) {
      existing.push(pl.conversation_id);
    }
    projectConversationMap.set(pl.project_id, existing);
  });

  return {
    highlights: (highlights || []).map((h) => ({
      id: h.id,
      content: h.content,
      label: h.label,
      conversation_id: h.conversation_id,
      conversation_title: conversationMap.get(h.conversation_id) || null,
    })),
    threads: (branches || []).map((b) => ({
      id: b.id,
      title: b.title,
      conversation_id: b.parent_conversation_id || '',
      conversation_title: conversationMap.get(b.parent_conversation_id || '') || null,
      is_branch: true,
    })),
    projects: (projects || []).map((p) => ({
      id: p.id,
      name: p.name,
      conversation_ids: projectConversationMap.get(p.id) || [],
    })),
  };
}

