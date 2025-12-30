// app/api/tasks/[id]/toggle-inactive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function POST(
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

    // Verify task belongs to user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, is_inactive')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Toggle is_inactive
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ is_inactive: !task.is_inactive })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedTask) {
      console.error('Error toggling task inactive flag:', updateError);
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Toggle task inactive error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle task inactive flag' },
      { status: 500 }
    );
  }
}

