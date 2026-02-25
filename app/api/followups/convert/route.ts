// app/api/followups/convert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { checkMeaningObjectLimit, incrementLimit } from '@/lib/limits';
import { dispatchStructureRecompute } from '@/lib/structure/dispatch';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type, // 'task' | 'decision' | 'highlight'
      prompt, // The follow-up question/prompt
      projectId, // Optional project to link to
      conversationIds, // Array of conversation IDs from search results
      answerContext, // The answer text for context
      sourceQuery, // The original Ask Index query
      ask_index_run_id, // The ask_index_run ID that generated this conversion
    } = body;

    if (!type || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: type, prompt' },
        { status: 400 }
      );
    }

    // Check meaning object limit for task/decision/highlight
    if (type === 'task' || type === 'decision' || type === 'highlight') {
      const limitCheck = await checkMeaningObjectLimit(user.id);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: limitCheck.message || 'Limit reached' },
          { status: 429 }
        );
      }
    }

    const supabase = await getSupabaseServerClient();

    // Get primary conversation from search results (first one)
    const primaryConversationId = conversationIds && conversationIds.length > 0 ? conversationIds[0] : null;

    // Get project if specified, or try to infer from conversation
    let projectIdToUse = projectId;
    if (!projectIdToUse && primaryConversationId) {
      const { data: projectLink } = await supabase
        .from('project_conversations')
        .select('project_id')
        .eq('conversation_id', primaryConversationId)
        .single();
      projectIdToUse = projectLink?.project_id || null;
    }

    switch (type) {
      case 'task': {
        // Create a task
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            project_id: projectIdToUse || null,
            conversation_id: primaryConversationId,
            title: prompt,
            description: answerContext ? `From: ${sourceQuery}\n\n${answerContext.substring(0, 500)}` : null,
            status: 'open',
            source_query: sourceQuery || null,
            source_ask_index_run_id: ask_index_run_id || null,
          })
          .select()
          .single();

        if (taskError || !task) {
          return NextResponse.json(
            { error: taskError?.message || 'Failed to create task' },
            { status: 500 }
          );
        }

        // Increment limit counter
        await incrementLimit(user.id, 'meaning_object');

        return NextResponse.json({ success: true, task });
      }

      case 'decision': {
        // Create a decision
        const { data: decision, error: decisionError } = await supabase
          .from('decisions')
          .insert({
            user_id: user.id,
            conversation_id: primaryConversationId,
            title: prompt,
            content: answerContext ? `From: ${sourceQuery}\n\n${answerContext.substring(0, 1000)}` : null,
            source_ask_index_run_id: ask_index_run_id || null,
          })
          .select()
          .single();

        if (decisionError || !decision) {
          return NextResponse.json(
            { error: decisionError?.message || 'Failed to create decision' },
            { status: 500 }
          );
        }

        // Increment limit counter
        await incrementLimit(user.id, 'meaning_object');

        // Dispatch structure recomputation (debounced)
        // Decision creation impacts thinking time and project linkage
        try {
          await dispatchStructureRecompute({
            supabaseClient: supabase,
            user_id: user.id,
            scope: 'user',
            reason: 'decision_change',
          });
        } catch (dispatchError) {
          // Log but don't fail the request if dispatch fails
          console.error('[FollowupConvert] Failed to dispatch structure recompute:', dispatchError);
        }

        return NextResponse.json({ success: true, decision });
      }

      case 'highlight': {
        // Create a highlight
        if (!primaryConversationId) {
          return NextResponse.json(
            { error: 'Cannot create highlight: no conversation found' },
            { status: 400 }
          );
        }

        // Get first message from the conversation
        const { data: firstMessage } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', primaryConversationId)
          .order('index_in_conversation', { ascending: true })
          .limit(1)
          .single();

        if (!firstMessage) {
          return NextResponse.json(
            { error: 'Cannot create highlight: no messages found in conversation' },
            { status: 400 }
          );
        }

        const { data: highlight, error: highlightError } = await supabase
          .from('highlights')
          .insert({
            user_id: user.id,
            conversation_id: primaryConversationId,
            message_id: firstMessage.id,
            content: prompt,
            label: prompt.substring(0, 100),
            source_ask_index_run_id: ask_index_run_id || null,
          })
          .select()
          .single();

        if (highlightError || !highlight) {
          return NextResponse.json(
            { error: highlightError?.message || 'Failed to create highlight' },
            { status: 500 }
          );
        }

        // Increment limit counter
        await incrementLimit(user.id, 'meaning_object');

        return NextResponse.json({ success: true, highlight });
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Convert follow-up error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert follow-up' },
      { status: 500 }
    );
  }
}

