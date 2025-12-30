// app/api/conversations/[id]/toggle-inactive/route.ts
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

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, is_inactive')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Toggle is_inactive
    const { data: updatedConversation, error: updateError } = await supabase
      .from('conversations')
      .update({ is_inactive: !conversation.is_inactive })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedConversation) {
      console.error('Error toggling conversation inactive flag:', updateError);
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, conversation: updatedConversation });
  } catch (error) {
    console.error('Toggle conversation inactive error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle conversation inactive flag' },
      { status: 500 }
    );
  }
}

