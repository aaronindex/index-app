// app/api/tasks/[id]/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['open', 'in_progress', 'complete', 'cancelled', 'dormant', 'priority'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: open, in_progress, complete, cancelled, dormant, or priority' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify task belongs to user
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update status
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedTask) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Update task status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update status' },
      { status: 500 }
    );
  }
}

