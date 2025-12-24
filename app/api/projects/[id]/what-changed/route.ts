// app/api/projects/[id]/what-changed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    // Verify project belongs to user
    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get date range (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get project conversations
    const { data: projectConversations } = await supabase
      .from('project_conversations')
      .select('conversation_id')
      .eq('project_id', id);

    const conversationIds = projectConversations?.map((pc) => pc.conversation_id) || [];

    // Get tasks changed this week
    const { data: tasksChanged } = await supabase
      .from('tasks')
      .select('id, title, status, updated_at, created_at')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .gte('updated_at', weekAgo.toISOString())
      .order('updated_at', { ascending: false });

    // Get decisions created this week
    const { data: decisionsCreated } = await supabase
      .from('decisions')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .in('conversation_id', conversationIds.length > 0 ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get highlights created this week
    const { data: highlightsCreated } = await supabase
      .from('highlights')
      .select('id, content, label, created_at')
      .eq('user_id', user.id)
      .in('conversation_id', conversationIds.length > 0 ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get conversations added this week
    const { data: conversationsAdded } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .in('id', conversationIds)
      .eq('user_id', user.id)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    // Categorize task changes
    const tasksCompleted = tasksChanged?.filter((t) => t.status === 'complete' && t.updated_at !== t.created_at) || [];
    const tasksStarted = tasksChanged?.filter((t) => t.status === 'in_progress' && t.updated_at !== t.created_at) || [];
    const tasksCreated = tasksChanged?.filter((t) => {
      const created = new Date(t.created_at);
      const updated = new Date(t.updated_at);
      return Math.abs(created.getTime() - updated.getTime()) < 1000; // Created and updated at same time
    }) || [];

    return NextResponse.json({
      success: true,
      weekStart: weekAgo.toISOString(),
      weekEnd: now.toISOString(),
      tasks: {
        completed: tasksCompleted.length,
        started: tasksStarted.length,
        created: tasksCreated.length,
        totalChanged: tasksChanged?.length || 0,
        items: tasksChanged || [],
      },
      decisions: {
        created: decisionsCreated?.length || 0,
        items: decisionsCreated || [],
      },
      highlights: {
        created: highlightsCreated?.length || 0,
        items: highlightsCreated || [],
      },
      conversations: {
        added: conversationsAdded?.length || 0,
        items: conversationsAdded || [],
      },
    });
  } catch (error) {
    console.error('What changed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch changes' },
      { status: 500 }
    );
  }
}

