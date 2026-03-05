// lib/ui-data/project-read-tab-data.ts
// Server-side data for Project Read tab (still unfolding, recent decisions, next tasks). Avoids client fetch flicker.

import type { SupabaseClient } from '@supabase/supabase-js';

export type StillUnfoldingItem = {
  type: 'decision' | 'task';
  id: string;
  title: string;
  isBlocker: boolean;
  isOpenLoop: boolean;
  conversationId: string | null;
  conversationTitle: string | null;
};

export type RecentDecision = { id: string; title: string; created_at: string };
export type NextTask = { id: string; title: string; status: string; created_at: string };

export type ProjectReadTabServerData = {
  hasConversations: boolean;
  stillUnfolding: StillUnfoldingItem[];
  recentDecisions: RecentDecision[];
  nextTasks: NextTask[];
};

export async function getProjectReadTabServerData(
  supabase: SupabaseClient,
  user_id: string,
  project_id: string,
  conversationIds: string[]
): Promise<ProjectReadTabServerData> {
  const hasConversations = conversationIds.length > 0;

  let stillUnfolding: StillUnfoldingItem[] = [];
  let recentDecisions: RecentDecision[] = [];
  let nextTasks: NextTask[] = [];

  if (!hasConversations) {
    return { hasConversations: false, stillUnfolding: [], recentDecisions: [], nextTasks: [] };
  }

  // Still-open: decisions + tasks, prioritized, top 3 (same logic as still-open API)
  let decisionsQuery = supabase
    .from('decisions')
    .select('id, title, content, created_at, is_pinned, conversation_id, conversations(title)')
    .eq('user_id', user_id)
    .eq('is_inactive', false);
  decisionsQuery = decisionsQuery.or(
    `project_id.eq.${project_id},conversation_id.in.(${conversationIds.join(',')})`
  );
  const { data: decisions } = await decisionsQuery
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, updated_at, created_at, is_pinned, conversation_id, source_query, conversations(title)')
    .eq('project_id', project_id)
    .eq('user_id', user_id)
    .eq('is_inactive', false)
    .not('status', 'in', '(complete,cancelled)')
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  const items: Array<{
    type: 'decision' | 'task';
    id: string;
    title: string;
    isBlocker: boolean;
    isOpenLoop: boolean;
    conversationId: string | null;
    conversationTitle: string | null;
    priority: number;
    updatedAt: string;
  }> = [];

  if (decisions) {
    decisions.forEach((d: { id: string; title: string | null; created_at: string; is_pinned: boolean; conversation_id: string | null; conversations: { title: string } | null }) => {
      items.push({
        type: 'decision',
        id: d.id,
        title: d.title || 'Untitled Decision',
        isBlocker: false,
        isOpenLoop: false,
        conversationId: d.conversation_id ?? null,
        conversationTitle: (d.conversations as { title?: string } | null)?.title ?? null,
        priority: d.is_pinned ? 1 : 4,
        updatedAt: d.created_at,
      });
    });
  }

  if (tasks) {
    tasks.forEach((t: { id: string; title: string | null; description: string | null; updated_at: string; created_at: string; is_pinned: boolean; conversation_id: string | null; conversations: { title: string } | null; source_query: string | null }) => {
      const isBlocker = (t.description ?? '').includes('[Blocker]');
      const isOpenLoop = (t.description ?? '').includes('[Open Loop]');
      let priority = 4;
      if (t.is_pinned) priority = 1;
      else if (isBlocker) priority = 2;
      else if (isOpenLoop) priority = 3;
      items.push({
        type: 'task',
        id: t.id,
        title: t.title || 'Untitled Task',
        isBlocker,
        isOpenLoop,
        conversationId: t.conversation_id ?? null,
        conversationTitle: (t.conversations as { title?: string } | null)?.title ?? null,
        priority,
        updatedAt: t.updated_at || t.created_at,
      });
    });
  }

  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  stillUnfolding = items.slice(0, 3).map((item) => ({
    type: item.type,
    id: item.id,
    title: item.title,
    isBlocker: item.isBlocker,
    isOpenLoop: item.isOpenLoop,
    conversationId: item.conversationId,
    conversationTitle: item.conversationTitle,
  }));

  // Recent decisions (limit 5)
  let decQuery = supabase
    .from('decisions')
    .select('id, title, created_at')
    .eq('user_id', user_id)
    .eq('is_inactive', false);
  decQuery = decQuery.or(
    `project_id.eq.${project_id},conversation_id.in.(${conversationIds.join(',')})`
  );
  const { data: decRows } = await decQuery.order('created_at', { ascending: false }).limit(5);
  recentDecisions = (decRows ?? []).map((r: { id: string; title: string | null; created_at: string }) => ({
    id: r.id,
    title: r.title || 'Untitled',
    created_at: r.created_at,
  }));

  // Next tasks (limit 5)
  const { data: taskRows } = await supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .eq('project_id', project_id)
    .eq('user_id', user_id)
    .eq('is_inactive', false)
    .not('status', 'in', '(complete,cancelled)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);
  nextTasks = (taskRows ?? []).map((t: { id: string; title: string | null; status: string; created_at: string }) => ({
    id: t.id,
    title: t.title || 'Untitled',
    status: t.status ?? 'open',
    created_at: t.created_at,
  }));

  return {
    hasConversations,
    stillUnfolding,
    recentDecisions,
    nextTasks,
  };
}
