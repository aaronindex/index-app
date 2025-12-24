// app/api/start-chat/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import {
  compileProjectContinuityPacket,
  compileTaskStartChatPacket,
  compileDecisionStartChatPacket,
} from '@/lib/startChat/compiler';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      originType, // 'project' | 'task' | 'decision'
      originId, // project_id, task_id, or decision_id
      intent, // Required for project, optional for task/decision
      targetTool = 'chatgpt', // 'chatgpt' | 'claude' | 'cursor' | 'other'
    } = body;

    if (!originType || !originId) {
      return NextResponse.json(
        { error: 'Missing required fields: originType, originId' },
        { status: 400 }
      );
    }

    if (originType === 'project' && !intent) {
      return NextResponse.json(
        { error: 'Intent is required for project-level Start Chat' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Compile the Continuity Packet
    let packet;
    let projectId: string | null = null;

    if (originType === 'project') {
      projectId = originId;
      packet = await compileProjectContinuityPacket(originId, user.id, intent, targetTool);
    } else if (originType === 'task') {
      const { data: task } = await supabase
        .from('tasks')
        .select('project_id')
        .eq('id', originId)
        .eq('user_id', user.id)
        .single();
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      projectId = task.project_id;
      packet = await compileTaskStartChatPacket(originId, user.id, targetTool);
    } else if (originType === 'decision') {
      // Get project from decision's conversation
      const { data: decision } = await supabase
        .from('decisions')
        .select('conversation_id')
        .eq('id', originId)
        .eq('user_id', user.id)
        .single();
      if (!decision) {
        return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
      }
      if (decision.conversation_id) {
        const { data: projectLink } = await supabase
          .from('project_conversations')
          .select('project_id')
          .eq('conversation_id', decision.conversation_id)
          .single();
        projectId = projectLink?.project_id || null;
      }
      packet = await compileDecisionStartChatPacket(originId, user.id, targetTool);
    } else {
      return NextResponse.json({ error: 'Invalid originType' }, { status: 400 });
    }

    // Create start_chat_runs record
    const { data: run, error: runError } = await supabase
      .from('start_chat_runs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        origin_type: originType,
        origin_id: originType === 'project' ? null : originId,
        target_tool: targetTool,
        intent: intent || null,
        prompt_text: packet.promptText,
        context_refs: packet.contextRefs,
        status: 'drafted',
      })
      .select()
      .single();

    if (runError || !run) {
      console.error('Error creating start_chat_runs record:', runError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      promptText: packet.promptText,
      contextRefs: packet.contextRefs,
      runId: run?.id || null,
    });
  } catch (error) {
    console.error('Generate Start Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate Start Chat prompt' },
      { status: 500 }
    );
  }
}

