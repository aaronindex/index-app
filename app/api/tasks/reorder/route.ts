// app/api/tasks/reorder/route.ts
// Reorder tasks within a project

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, projectId, newOrder } = body;

    if (!taskId || !projectId || typeof newOrder !== 'number') {
      return NextResponse.json(
        { error: 'taskId, projectId, and newOrder (number) are required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify task belongs to user and project
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, user_id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task sort_order
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ sort_order: newOrder })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError || !updatedTask) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to reorder task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Reorder task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reorder task' },
      { status: 500 }
    );
  }
}

