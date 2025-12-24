// app/api/branches/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parent_conversation_id, origin_highlight_id, title } = body;

    if (!parent_conversation_id || !origin_highlight_id) {
      return NextResponse.json(
        { error: 'Missing required fields: parent_conversation_id, origin_highlight_id' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify parent conversation belongs to user
    const { data: parentConversation, error: convError } = await supabase
      .from('conversations')
      .select('id, title')
      .eq('id', parent_conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !parentConversation) {
      return NextResponse.json({ error: 'Parent conversation not found' }, { status: 404 });
    }

    // Verify highlight belongs to user and conversation
    const { data: highlight, error: highlightError } = await supabase
      .from('highlights')
      .select('id, conversation_id, content')
      .eq('id', origin_highlight_id)
      .eq('user_id', user.id)
      .eq('conversation_id', parent_conversation_id)
      .single();

    if (highlightError || !highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    // Create branch conversation
    const branchTitle = title?.trim() || `Branch: ${highlight.content.substring(0, 50)}...`;
    
    const { data: branchConversation, error: branchError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: branchTitle,
        source: 'branch',
        parent_conversation_id: parent_conversation_id,
        origin_highlight_id: origin_highlight_id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (branchError || !branchConversation) {
      console.error('Error creating branch:', branchError);
      return NextResponse.json(
        { error: branchError?.message || 'Failed to create branch' },
        { status: 500 }
      );
    }

    // Link highlight to branch
    const { error: linkError } = await supabase
      .from('branch_highlights')
      .insert({
        branch_conversation_id: branchConversation.id,
        highlight_id: origin_highlight_id,
      });

    if (linkError) {
      console.error('Error linking highlight to branch:', linkError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ success: true, branch: branchConversation });
  } catch (error) {
    console.error('Create branch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create branch' },
      { status: 500 }
    );
  }
}

