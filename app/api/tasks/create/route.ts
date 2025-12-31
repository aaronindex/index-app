// app/api/tasks/create/route.ts
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
    const {
      title,
      description,
      project_id,
      conversation_id,
      source_highlight_id,
      status = 'open',
    } = body;


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

    // Verify highlight belongs to user if provided
    if (source_highlight_id) {
      const { data: highlight, error: highlightError } = await supabase
        .from('highlights')
        .select('id')
        .eq('id', source_highlight_id)
        .eq('user_id', user.id)
        .single();

      if (highlightError || !highlight) {
        return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
      }
    }

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        project_id: project_id || null,
        conversation_id: conversation_id || null,
        source_highlight_id: source_highlight_id || null,
        title: title.trim(),
        description: description?.trim() || null,
        status: status,
      })
      .select()
      .single();

    if (taskError || !task) {
      console.error('Error creating task:', taskError);
      return NextResponse.json(
        { error: taskError?.message || 'Failed to create task' },
        { status: 500 }
      );
    }

    // Increment limit counter
    await incrementLimit(user.id, 'meaning_object');

    // Fire analytics event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'task_created',
        task_id: task.id,
        has_project: !!project_id,
      });
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    );
  }
}

