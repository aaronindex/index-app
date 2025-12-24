// app/api/conversations/[id]/delete/route.ts
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

    // Verify conversation belongs to user
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if this conversation has branches (child conversations)
    const { data: branches } = await supabase
      .from('conversations')
      .select('id')
      .eq('parent_conversation_id', id)
      .eq('user_id', user.id);

    if (branches && branches.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete conversation with branches. Delete branches first.' },
        { status: 400 }
      );
    }

    // Delete in order (respecting foreign key constraints)
    // 1. Delete message_chunk_embeddings (via chunks)
    const { data: chunks } = await supabase
      .from('message_chunks')
      .select('id')
      .eq('conversation_id', id);

    if (chunks && chunks.length > 0) {
      const chunkIds = chunks.map((c) => c.id);
      await supabase
        .from('message_chunk_embeddings')
        .delete()
        .in('chunk_id', chunkIds);
    }

    // 2. Delete message_chunks
    await supabase.from('message_chunks').delete().eq('conversation_id', id);

    // 3. Delete highlight_embeddings (via highlights)
    const { data: highlights } = await supabase
      .from('highlights')
      .select('id')
      .eq('conversation_id', id);

    if (highlights && highlights.length > 0) {
      const highlightIds = highlights.map((h) => h.id);
      await supabase
        .from('highlight_embeddings')
        .delete()
        .in('highlight_id', highlightIds);
    }

    // 4. Delete branch_highlights (where this is the branch)
    await supabase
      .from('branch_highlights')
      .delete()
      .eq('branch_conversation_id', id);

    // 5. Delete highlights
    await supabase.from('highlights').delete().eq('conversation_id', id);

    // 6. Delete messages
    await supabase.from('messages').delete().eq('conversation_id', id);

    // 7. Delete project_conversations links
    await supabase.from('project_conversations').delete().eq('conversation_id', id);

    // 8. Delete the conversation itself
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

