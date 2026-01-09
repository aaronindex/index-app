// app/api/tasks/pin/route.ts
// Pin/unpin a task (max one pinned task per project)

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
    const { taskId, pinned } = body;

    if (typeof pinned !== 'boolean') {
      return NextResponse.json({ error: 'pinned must be a boolean' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Get task to verify ownership and get project_id
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, user_id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // If pinning, unpin any other pinned task in the same project
    if (pinned && task.project_id) {
      await supabase
        .from('tasks')
        .update({ is_pinned: false })
        .eq('project_id', task.project_id)
        .eq('user_id', user.id)
        .neq('id', taskId)
        .eq('is_pinned', true);
    }

    // Update task pin status
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({ is_pinned: pinned })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError || !updatedTask) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Pin task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pin task' },
      { status: 500 }
    );
  }
}

