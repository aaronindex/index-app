// app/api/decisions/create/route.ts
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
    const { title, content, conversation_id, project_id } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify project belongs to user if provided
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

    // Verify conversation belongs to user if provided
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

    // Create decision
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        conversation_id: conversation_id || null,
        title: title.trim(),
        content: content?.trim() || null,
      })
      .select()
      .single();

    if (decisionError) {
      console.error('Error creating decision:', decisionError);
      return NextResponse.json(
        { error: decisionError?.message || 'Failed to create decision', details: decisionError },
        { status: 500 }
      );
    }

    if (!decision) {
      console.error('No decision returned from insert');
      return NextResponse.json(
        { error: 'Failed to create decision: no data returned' },
        { status: 500 }
      );
    }

    console.log('Decision created successfully:', decision.id);
    return NextResponse.json({ success: true, decision });
  } catch (error) {
    console.error('Create decision error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create decision' },
      { status: 500 }
    );
  }
}

