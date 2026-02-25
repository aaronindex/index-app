// app/api/insights/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { extractInsights, ExtractedInsight } from '@/lib/ai/insights';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing required field: conversationId' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, title, user_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get all messages for the conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, content, index_in_conversation')
      .eq('conversation_id', conversationId)
      .order('index_in_conversation', { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: messagesError.message || 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found in conversation' },
        { status: 400 }
      );
    }

    // Get project this conversation belongs to (if any)
    const { data: projectLink } = await supabase
      .from('project_conversations')
      .select('project_id')
      .eq('conversation_id', conversationId)
      .single();

    const projectId = projectLink?.project_id || null;

    // Prepare conversation content for extraction
    const conversationContent = {
      id: conversation.id,
      title: conversation.title,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content,
        index_in_conversation: m.index_in_conversation,
      })),
    };

    // Extract insights
    const insights = await extractInsights(conversationContent);

    // Store extracted insights
    const createdInsights: any[] = [];

    // Store decisions
    let decisionCreated = false;
    for (const decision of insights.decisions) {
      const { data: decisionRecord, error: decisionError } = await supabase
        .from('decisions')
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          title: decision.title,
          content: decision.content + (decision.context ? `\n\nContext: ${decision.context}` : ''),
        })
        .select()
        .single();

      if (decisionError) {
        console.error('Error creating decision:', decisionError);
      } else if (decisionRecord) {
        decisionCreated = true;
        const { type: _, ...decisionData } = decision;
        createdInsights.push({ type: 'decision', id: decisionRecord.id, ...decisionData });
      }
    }

    // Dispatch structure recomputation if decisions were created (debounced)
    if (decisionCreated) {
      try {
        const { dispatchStructureRecompute } = await import('@/lib/structure/dispatch');
        await dispatchStructureRecompute({
          supabaseClient: supabase,
          user_id: user.id,
          scope: 'user',
          reason: 'decision_change',
        });
      } catch (dispatchError) {
        // Log but don't fail the request if dispatch fails
        console.error('[InsightsExtract] Failed to dispatch structure recompute:', dispatchError);
      }
    }

    // Store commitments (as tasks with special status or in a separate table)
    // For now, we'll store them as tasks with status 'open' and a special description
    for (const commitment of insights.commitments) {
      const { data: taskRecord, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: projectId,
          conversation_id: conversationId,
          title: commitment.title,
          description: `[Commitment] ${commitment.content}${commitment.context ? `\n\nContext: ${commitment.context}` : ''}`,
          status: 'open',
          source_query: 'AI Insight Extraction',
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating commitment task:', taskError);
      } else if (taskRecord) {
        const { type: _, ...commitmentData } = commitment;
        createdInsights.push({ type: 'commitment', id: taskRecord.id, ...commitmentData });
      }
    }

    // Store blockers (as tasks with special description)
    for (const blocker of insights.blockers) {
      const { data: taskRecord, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: projectId,
          conversation_id: conversationId,
          title: blocker.title,
          description: `[Blocker] ${blocker.content}${blocker.context ? `\n\nContext: ${blocker.context}` : ''}`,
          status: 'open',
          source_query: 'AI Insight Extraction',
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating blocker task:', taskError);
      } else if (taskRecord) {
        const { type: _, ...blockerData } = blocker;
        createdInsights.push({ type: 'blocker', id: taskRecord.id, ...blockerData });
      }
    }

    // Store open loops (as tasks)
    for (const openLoop of insights.openLoops) {
      const { data: taskRecord, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: projectId,
          conversation_id: conversationId,
          title: openLoop.title,
          description: `[Open Loop] ${openLoop.content}${openLoop.context ? `\n\nContext: ${openLoop.context}` : ''}`,
          status: 'open',
          source_query: 'AI Insight Extraction',
        })
        .select()
        .single();

      if (taskError) {
        console.error('Error creating open loop task:', taskError);
      } else if (taskRecord) {
        const { type: _, ...openLoopData } = openLoop;
        createdInsights.push({ type: 'open_loop', id: taskRecord.id, ...openLoopData });
      }
    }

    // Store suggested highlights
    for (const highlight of insights.suggestedHighlights) {
      // Find the message for this highlight
      const messageIndex = highlight.message_index !== undefined ? highlight.message_index : 0;
      const targetMessage = messages.find((m) => m.index_in_conversation === messageIndex) || messages[0];

      if (targetMessage) {
        const { data: highlightRecord, error: highlightError } = await supabase
          .from('highlights')
          .insert({
            user_id: user.id,
            conversation_id: conversationId,
            message_id: targetMessage.id,
            content: highlight.content,
            label: highlight.title,
          })
          .select()
          .single();

        if (!highlightError && highlightRecord) {
          const { type: _, ...highlightData } = highlight;
          createdInsights.push({ type: 'highlight', id: highlightRecord.id, ...highlightData });
        }
      }
    }

    return NextResponse.json({
      success: true,
      insights: {
        decisions: insights.decisions.length,
        commitments: insights.commitments.length,
        blockers: insights.blockers.length,
        openLoops: insights.openLoops.length,
        suggestedHighlights: insights.suggestedHighlights.length,
      },
      created: createdInsights.length,
      details: createdInsights,
    });
  } catch (error) {
    console.error('Extract insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract insights' },
      { status: 500 }
    );
  }
}

