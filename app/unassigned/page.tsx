// app/unassigned/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import type { Metadata } from 'next';
import UnassignedConversationsClient from './components/UnassignedConversationsClient';

export const metadata: Metadata = {
  title: "Unassigned | INDEX",
  description: "Conversations not yet assigned to a project",
};

export default async function UnassignedPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await getSupabaseServerClient();

  // Get all active conversations for this user
  // Conversations are marked inactive during import and activated when complete
  const { data: allConversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_inactive', false) // Only show active (completed) conversations
    .is('parent_conversation_id', null); // Only top-level conversations, not branches

  const allConversationIds = allConversations?.map((c) => c.id) || [];

  // Get all project-conversation links
  const { data: projectLinks } = await supabase
    .from('project_conversations')
    .select('conversation_id')
    .in('conversation_id', allConversationIds.length > 0 ? allConversationIds : ['']);

  const assignedConversationIds = new Set(projectLinks?.map((pc) => pc.conversation_id) || []);

  // Get unassigned conversations (not in any project)
  const unassignedIds = allConversationIds.filter((id) => !assignedConversationIds.has(id));

  // Fetch full conversation data for unassigned
  let unassignedConversations: any[] = [];

  if (unassignedIds.length > 0) {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, title, created_at, started_at')
      .in('id', unassignedIds)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Get message counts
    const { data: messageCounts } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', unassignedIds);

    const countMap = new Map<string, number>();
    messageCounts?.forEach((mc) => {
      const count = countMap.get(mc.conversation_id) || 0;
      countMap.set(mc.conversation_id, count + 1);
    });

    unassignedConversations =
      conversations?.map((conv) => ({
        id: conv.id,
        title: conv.title,
        messageCount: countMap.get(conv.id) || 0,
        createdAt: conv.created_at || conv.started_at,
      })) || [];
  }

  // Get user's projects for assignment dropdown
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <UnassignedConversationsClient
      conversations={unassignedConversations}
      projects={projects || []}
    />
  );
}

