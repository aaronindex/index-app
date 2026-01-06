// app/api/highlights/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { checkMeaningObjectLimit, incrementLimit } from '@/lib/limits';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check meaning object limit
    const limitCheck = await checkMeaningObjectLimit(user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || 'Limit reached' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { conversation_id, message_id, content, start_offset, end_offset, label } = body;

    if (!conversation_id || !message_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: conversation_id, message_id, content' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Create highlight
    const { data: highlight, error: highlightError } = await supabase
      .from('highlights')
      .insert({
        user_id: user.id,
        conversation_id,
        message_id,
        content: content.trim(),
        start_offset: start_offset ?? null,
        end_offset: end_offset ?? null,
        label: label?.trim() || null,
      })
      .select()
      .single();

    if (highlightError || !highlight) {
      console.error('Error creating highlight:', highlightError);
      return NextResponse.json(
        { error: highlightError?.message || 'Failed to create highlight' },
        { status: 500 }
      );
    }

    // Increment limit counter
    await incrementLimit(user.id, 'meaning_object');

    // Note: Analytics event should be fired client-side after successful creation
    // This ensures it only fires on actual success and can include UI context

    return NextResponse.json({ success: true, highlight });
  } catch (error) {
    console.error('Create highlight error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create highlight' },
      { status: 500 }
    );
  }
}

