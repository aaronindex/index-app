// app/api/projects/[id]/read-data/route.ts
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
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'decisions', 'tasks', or 'chats'
    const limit = parseInt(searchParams.get('limit') || '5', 10);

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

    if (type === 'decisions') {
      // Get recent decisions (limit N)
      let decisionsQuery = supabase
        .from('decisions')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .eq('is_inactive', false);

      // Build OR condition: project_id = id OR conversation_id in conversationIds
      if (conversationIds.length > 0) {
        decisionsQuery = decisionsQuery.or(`project_id.eq.${id},conversation_id.in.(${conversationIds.join(',')})`);
      } else {
        decisionsQuery = decisionsQuery.eq('project_id', id);
      }

      const { data: decisions } = await decisionsQuery
        .order('created_at', { ascending: false })
        .limit(limit);

      return NextResponse.json({
        items: decisions || [],
      });
    }

    if (type === 'tasks') {
      // Get top tasks (not done, not blocked unless also in tensions)
      // Order by priority/recency/status
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, created_at')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .eq('is_inactive', false)
        .not('status', 'in', '(complete,cancelled)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      return NextResponse.json({
        items: tasks || [],
      });
    }

    if (type === 'chats') {
      // Get recent chats imported/updated in this project
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .in('id', conversationIds.length > 0 ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      return NextResponse.json({
        items: conversations || [],
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching read data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
