// app/api/digests/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { generateWeeklyDigest } from '@/lib/ai/digest';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { weekStart, weekEnd } = body;

    if (!weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'weekStart and weekEnd are required (YYYY-MM-DD format)' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Check if digest already exists for this week
    const { data: existingDigest } = await supabase
      .from('weekly_digests')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .eq('week_end', weekEnd)
      .single();

    if (existingDigest) {
      return NextResponse.json(
        { error: 'Digest already exists for this week' },
        { status: 400 }
      );
    }

    // Get conversations from this week
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekEnd);
    weekEndDate.setHours(23, 59, 59, 999); // End of day

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .gte('created_at', weekStartDate.toISOString())
      .lte('created_at', weekEndDate.toISOString())
      .order('created_at', { ascending: false });

    if (!conversations || conversations.length === 0) {
      return NextResponse.json(
        { error: 'No conversations found for this week' },
        { status: 400 }
      );
    }

    // Get messages count and highlights for each conversation
    const conversationIds = conversations.map((c) => c.id);
    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, content, index_in_conversation')
      .in('conversation_id', conversationIds)
      .order('conversation_id, index_in_conversation');

    const { data: highlights } = await supabase
      .from('highlights')
      .select('id, conversation_id, content, label')
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id);

    // Get tasks created this week
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, status')
      .eq('user_id', user.id)
      .gte('created_at', weekStartDate.toISOString())
      .lte('created_at', weekEndDate.toISOString())
      .order('created_at', { ascending: false });

    // Get decisions created this week
    const { data: decisions } = await supabase
      .from('decisions')
      .select('id, title, content, conversation_id')
      .eq('user_id', user.id)
      .gte('created_at', weekStartDate.toISOString())
      .lte('created_at', weekEndDate.toISOString())
      .order('created_at', { ascending: false });

    // Build conversation summaries
    const conversationSummaries = conversations.map((conv) => {
      const convMessages = messages?.filter((m) => m.conversation_id === conv.id) || [];
      const convHighlights = highlights?.filter((h) => h.conversation_id === conv.id) || [];
      const firstMessage = convMessages.find((m) => m.index_in_conversation === 0);

      return {
        id: conv.id,
        title: conv.title,
        messageCount: convMessages.length,
        highlights: convHighlights.map((h) => ({
          content: h.content,
          label: h.label,
        })),
        firstMessage: firstMessage?.content.substring(0, 200) || null,
      };
    });

    // Build task summaries
    const taskSummaries = tasks?.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as 'open' | 'in_progress' | 'complete' | 'cancelled',
    })) || [];

    // Build decision summaries
    const decisionSummaries = decisions?.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
    })) || [];

    // Generate digest
    const digestData = await generateWeeklyDigest(
      conversationSummaries,
      weekStartDate,
      weekEndDate,
      taskSummaries,
      decisionSummaries,
      {
        conversations: conversations.length,
        highlights: highlights?.length || 0,
        tasks: tasks?.length || 0,
        decisions: decisions?.length || 0,
      }
    );

    // Save digest to database
    const { data: digest, error: insertError } = await supabase
      .from('weekly_digests')
      .insert({
        user_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
        summary: digestData.summary,
        what_changed: digestData.whatChanged,
        top_themes: digestData.topThemes,
        open_loops: digestData.openLoops,
        recommended_next_steps: digestData.recommendedNextSteps,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving digest:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to save digest' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, digest });
  } catch (error) {
    console.error('Generate digest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate digest' },
      { status: 500 }
    );
  }
}

