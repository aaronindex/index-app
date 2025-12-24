// app/api/home/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // 1. Priority Items: Open tasks and open decisions
    // Include AI-extracted insights (commitments, blockers, open loops) which are stored as tasks
    const { data: openTasks } = await supabase
      .from('tasks')
      .select('id, title, description, status, project_id, conversation_id, created_at, source_query, projects(name)')
      .eq('user_id', user.id)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Get decisions (assuming they don't have a status field, so we'll get recent ones)
    const { data: recentDecisions } = await supabase
      .from('decisions')
      .select('id, title, content, conversation_id, created_at, conversations(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // 2. Latest Insights: Recent highlights
    const { data: recentHighlights } = await supabase
      .from('highlights')
      .select('id, content, label, conversation_id, created_at, conversations(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);


    // 4. Latest Digest
    const { data: latestDigest } = await supabase
      .from('weekly_digests')
      .select('id, week_start, week_end, summary, top_themes, open_loops')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .single();

    // 5. Recent conversations for "things to revisit" (conversations with no recent activity but have highlights)
    const { data: conversationsWithHighlights } = await supabase
      .from('conversations')
      .select('id, title, created_at, started_at, ended_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get highlights for these conversations
    const conversationIds = conversationsWithHighlights?.map((c) => c.id) || [];
    const { data: allHighlights } = await supabase
      .from('highlights')
      .select('conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id);

    // Find conversations that haven't been updated recently but have highlights
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const thingsToRevisit = conversationsWithHighlights
      ?.filter((conv) => {
        const convHighlights = allHighlights?.filter((h) => h.conversation_id === conv.id) || [];
        const hasHighlights = convHighlights.length > 0;
        const isOld = new Date(conv.created_at) < twoWeeksAgo;
        return hasHighlights && isOld;
      })
      .slice(0, 3)
      .map((conv) => ({
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        updated_at: conv.ended_at || conv.created_at,
      })) || [];

    // Check if user has any conversations or projects (for empty state)
    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      hasConversations: (conversationCount || 0) > 0,
      hasProjects: (projectCount || 0) > 0,
      priorityItems: {
        tasks: openTasks?.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          project_id: t.project_id,
          project_name: t.projects?.name || null,
          conversation_id: t.conversation_id,
          created_at: t.created_at,
        })) || [],
        decisions: recentDecisions?.map((d) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          conversation_id: d.conversation_id,
          conversation_title: d.conversations?.title || null,
          created_at: d.created_at,
        })) || [],
      },
      latestInsights: recentHighlights?.map((h) => ({
        id: h.id,
        content: h.content,
        label: h.label,
        conversation_id: h.conversation_id,
        conversation_title: h.conversations?.title || null,
        created_at: h.created_at,
      })) || [],
      thingsToRevisit,
      latestDigest: latestDigest ? {
        id: latestDigest.id,
        week_start: latestDigest.week_start,
        week_end: latestDigest.week_end,
        summary: latestDigest.summary,
        top_themes: latestDigest.top_themes,
        open_loops: latestDigest.open_loops,
      } : null,
    });
  } catch (error) {
    console.error('Home data API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch home data' },
      { status: 500 }
    );
  }
}

