// app/api/redactions/create/route.ts
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
    const { 
      project_id, 
      conversation_id, 
      message_id, 
      message_chunk_id,
      selection_start, 
      selection_end, 
      redacted_text, 
      reason 
    } = body;

    if (!redacted_text || (!conversation_id && !project_id)) {
      return NextResponse.json(
        { error: 'Missing required fields: redacted_text and at least one of project_id or conversation_id' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify conversation belongs to user (if provided)
    if (conversation_id) {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversation_id)
        .eq('user_id', user.id)
        .single();

      if (convError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
    }

    // Verify project belongs to user (if provided)
    if (project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .eq('user_id', user.id)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    // Create redaction
    const { data: redaction, error: redactionError } = await supabase
      .from('redactions')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        conversation_id: conversation_id || null,
        message_id: message_id || null,
        message_chunk_id: message_chunk_id || null,
        selection_start: selection_start ?? null,
        selection_end: selection_end ?? null,
        redacted_text: redacted_text.trim(),
        reason: reason?.trim() || null,
      })
      .select()
      .single();

    if (redactionError || !redaction) {
      console.error('Error creating redaction:', redactionError);
      return NextResponse.json(
        { error: redactionError?.message || 'Failed to create redaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, redaction });
  } catch (error) {
    console.error('Create redaction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create redaction' },
      { status: 500 }
    );
  }
}

