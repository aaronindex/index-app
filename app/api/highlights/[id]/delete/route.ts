// app/api/highlights/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function DELETE(
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

    // Verify highlight belongs to user
    const { data: highlight, error: fetchError } = await supabase
      .from('highlights')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    // Delete highlight_embeddings first (if they exist)
    try {
      await supabase
        .from('highlight_embeddings')
        .delete()
        .eq('highlight_id', id);
    } catch {
      // Table might not exist, ignore
    }

    // Delete branch_highlights links (if any)
    try {
      await supabase
        .from('branch_highlights')
        .delete()
        .eq('highlight_id', id);
    } catch {
      // Table might not exist or no links, ignore
    }

    // Delete highlight
    const { error: deleteError } = await supabase
      .from('highlights')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting highlight:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete highlight' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Delete highlight error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

