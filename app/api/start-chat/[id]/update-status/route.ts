// app/api/start-chat/[id]/update-status/route.ts
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
    const body = await request.json();
    const { status } = body;

    if (!status || !['copied', 'harvested', 'abandoned'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: copied, harvested, or abandoned' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify run belongs to user
    const { data: run, error: fetchError } = await supabase
      .from('start_chat_runs')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !run) {
      return NextResponse.json({ error: 'Start Chat run not found' }, { status: 404 });
    }

    // Update status
    const { data: updatedRun, error: updateError } = await supabase
      .from('start_chat_runs')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedRun) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, run: updatedRun });
  } catch (error) {
    console.error('Update Start Chat status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update status' },
      { status: 500 }
    );
  }
}

