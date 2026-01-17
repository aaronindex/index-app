// app/api/projects/[id]/still-open/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Verify project belongs to user
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get project conversation IDs
    const { data: projectConversations } = await supabase
      .from('project_conversations')
      .select('conversation_id')
      .eq('project_id', id);

    const conversationIds = projectConversations?.map((pc) => pc.conversation_id) || [];

    // Get decisions for this project (by project_id OR by conversation_id)
    // Only active decisions
    let decisionsQuery = supabase
      .from('decisions')
      .select('id, title, content, created_at, is_pinned, conversation_id, conversations(title)')
      .eq('user_id', user.id)
      .eq('is_inactive', false);

    // Build OR condition: project_id = id OR conversation_id in conversationIds
    if (conversationIds.length > 0) {
      decisionsQuery = decisionsQuery.or(`project_id.eq.${id},conversation_id.in.(${conversationIds.join(',')})`);
    } else {
      // If no conversations, only show decisions with project_id
      decisionsQuery = decisionsQuery.eq('project_id', id);
    }

    const { data: decisions } = await decisionsQuery
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // Get tasks for this project (only active, not completed/cancelled)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, status, created_at, updated_at, is_pinned, conversation_id, source_query, conversations(title)')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .eq('is_inactive', false)
      .not('status', 'in', '(complete,cancelled)')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    // Combine and prioritize items
    const items: Array<{
      type: 'decision' | 'task';
      id: string;
      title: string;
      isPinned: boolean;
      isBlocker: boolean;
      isOpenLoop: boolean;
      updatedAt: string;
      conversationId?: string | null;
      conversationTitle?: string | null;
      isAIGenerated?: boolean;
      priority: number;
    }> = [];

    // Add decisions
    if (decisions) {
      decisions.forEach((decision) => {
        items.push({
          type: 'decision',
          id: decision.id,
          title: decision.title || 'Untitled Decision',
          isPinned: decision.is_pinned || false,
          isBlocker: false,
          isOpenLoop: false,
          updatedAt: decision.created_at,
          conversationId: decision.conversation_id,
          conversationTitle: (decision.conversations as any)?.title || null,
          priority: decision.is_pinned ? 1 : 4, // Pinned = priority 1, else 4
        });
      });
    }

    // Add tasks
    if (tasks) {
      tasks.forEach((task) => {
        const isBlocker = task.description?.includes('[Blocker]') || false;
        const isOpenLoop = task.description?.includes('[Open Loop]') || false;
        const isAIGenerated = task.source_query === 'AI Insight Extraction';
        
        let priority = 4; // Default: recently updated
        if (task.is_pinned) {
          priority = 1; // Pinned = highest priority
        } else if (isBlocker) {
          priority = 2; // Blocker = second priority
        } else if (isOpenLoop) {
          priority = 3; // Open Loop = third priority
        }

        items.push({
          type: 'task',
          id: task.id,
          title: task.title || 'Untitled Task',
          isPinned: task.is_pinned || false,
          isBlocker,
          isOpenLoop,
          isAIGenerated,
          updatedAt: task.updated_at || task.created_at,
          conversationId: task.conversation_id,
          conversationTitle: (task.conversations as any)?.title || null,
          priority,
        });
      });
    }

    // Sort by priority (1 = highest), then by updated_at (most recent first)
    items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // Return only top 3 items
    const topItems = items.slice(0, 3).map((item) => ({
      type: item.type,
      id: item.id,
      title: item.title,
      isBlocker: item.isBlocker,
      isOpenLoop: item.isOpenLoop,
      conversationId: item.conversationId || null,
      conversationTitle: item.conversationTitle || null,
      isAIGenerated: (item as any).isAIGenerated || false,
    }));

    return NextResponse.json({
      items: topItems,
      totalAvailable: items.length,
    });
  } catch (error) {
    console.error('Error fetching still open items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

