// app/api/home/still-open/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Get all decisions (active, across all projects)
    const { data: decisions } = await supabase
      .from('decisions')
      .select('id, title, created_at, is_pinned, project_id, conversation_id, projects(name), conversations(title)')
      .eq('user_id', user.id)
      .eq('is_inactive', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // Get all tasks (active, not completed/cancelled, across all projects)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, status, created_at, updated_at, is_pinned, project_id, conversation_id, source_query, projects(name), conversations(title)')
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
      isOpen: boolean;
      updatedAt: string;
      projectId: string | null;
      projectName: string | null;
      conversationId?: string | null;
      conversationTitle?: string | null;
      isBlocker?: boolean;
      isOpenLoop?: boolean;
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
          isOpen: true, // All decisions are "open" (no status field)
          updatedAt: decision.created_at,
          projectId: decision.project_id,
          projectName: (decision.projects as any)?.name || null,
          conversationId: decision.conversation_id,
          conversationTitle: (decision.conversations as any)?.title || null,
          priority: decision.is_pinned ? 1 : 2, // Pinned = 1, open = 2
        });
      });
    }

    // Add tasks
    if (tasks) {
      tasks.forEach((task) => {
        const isOpen = task.status === 'open' || task.status === 'in_progress' || task.status === 'priority';
        const isBlocker = task.description?.includes('[Blocker]') || false;
        const isOpenLoop = task.description?.includes('[Open Loop]') || false;
        const isAIGenerated = task.source_query === 'AI Insight Extraction';
        
        let priority = 3; // Default: recency fallback
        if (task.is_pinned) {
          priority = 1; // Pinned = highest priority
        } else if (isOpen) {
          priority = 2; // Open status = second priority
        }

        items.push({
          type: 'task',
          id: task.id,
          title: task.title || 'Untitled Task',
          isPinned: task.is_pinned || false,
          isOpen,
          isBlocker,
          isOpenLoop,
          isAIGenerated,
          updatedAt: task.updated_at || task.created_at,
          projectId: task.project_id,
          projectName: (task.projects as any)?.name || null,
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
      projectId: item.projectId,
      projectName: item.projectName,
      conversationId: item.conversationId || null,
      conversationTitle: item.conversationTitle || null,
      isBlocker: (item as any).isBlocker || false,
      isOpenLoop: (item as any).isOpenLoop || false,
      isAIGenerated: (item as any).isAIGenerated || false,
    }));

    return NextResponse.json({
      items: topItems,
      totalAvailable: items.length,
    });
  } catch (error) {
    console.error('Error fetching global still open items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

