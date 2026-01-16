// app/api/projects/[id]/has-conversations/route.ts
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
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project has any conversations
    const { count, error } = await supabase
      .from('project_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to check conversations' }, { status: 500 });
    }

    return NextResponse.json({
      hasConversations: (count || 0) > 0,
    });
  } catch (error) {
    console.error('Check conversations error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check conversations' },
      { status: 500 }
    );
  }
}

