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

    // 1. Priority Items: Priority tasks and priority decisions first
    // Stance-based ordering: Priority > Open > Everything else
    // Default: exclude inactive items and personal projects
    
    // Get priority tasks first
    const { data: priorityTasks } = await supabase
      .from('tasks')
      .select('id, title, description, status, project_id, conversation_id, created_at, updated_at, source_query, projects(name)')
      .eq('user_id', user.id)
      .eq('is_inactive', false)
      .eq('status', 'priority')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get open/in_progress tasks (excluding priority, which we already have)
    const { data: openTasksData } = await supabase
      .from('tasks')
      .select('id, title, description, status, project_id, conversation_id, created_at, updated_at, source_query, projects(name)')
      .eq('user_id', user.id)
      .eq('is_inactive', false)
      .in('status', ['open', 'in_progress'])
      .order('updated_at', { ascending: true }) // Oldest updated first (stuck signals)
      .limit(20);

    // Combine and order tasks (no personal filtering - all projects shown)
    const priorityTasksFiltered = priorityTasks || [];
    const openTasksFiltered = openTasksData || [];
    
    // Combine: Priority first, then open tasks (oldest updated first = stuck signals)
    const allTasks = [...priorityTasksFiltered, ...openTasksFiltered].slice(0, 10);

    // Get decisions without resolution (open loops)
    // Decisions don't have a status field, so we get recent ones
    // Stance: prioritize decisions that might need follow-up
    const { data: recentDecisions } = await supabase
      .from('decisions')
      .select('id, title, content, conversation_id, project_id, created_at, conversations(title), projects(name)')
      .eq('user_id', user.id)
      .eq('is_inactive', false)
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

    // 5. Recent conversations for "things to revisit" (conversations with no recent activity but have highlights/tasks/decisions)
    // Stance: Only surface conversations with thought-objects (highlights, tasks, decisions)
    // Default: exclude inactive conversations
    const { data: allConversations } = await supabase
      .from('conversations')
      .select('id, title, created_at, started_at, ended_at')
      .eq('user_id', user.id)
      .eq('is_inactive', false)
      .order('created_at', { ascending: false })
      .limit(50); // Get more to filter

    const conversationIds = allConversations?.map((c) => c.id) || [];
    
    // Get highlights, tasks, and decisions for these conversations
    const { data: allHighlights } = await supabase
      .from('highlights')
      .select('conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id);

    const { data: allTasksForConvs } = await supabase
      .from('tasks')
      .select('conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id)
      .eq('is_inactive', false);

    const { data: allDecisionsForConvs } = await supabase
      .from('decisions')
      .select('conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id)
      .eq('is_inactive', false);

    // Find conversations that have thought-objects (highlights, tasks, or decisions)
    // Stance: Only show conversations with meaning objects, not raw conversations
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const conversationsToRevisit = allConversations
      ?.filter((conv) => {
        const convHighlights = allHighlights?.filter((h) => h.conversation_id === conv.id) || [];
        const convTasks = allTasksForConvs?.filter((t) => t.conversation_id === conv.id) || [];
        const convDecisions = allDecisionsForConvs?.filter((d) => d.conversation_id === conv.id) || [];
        
        // Must have at least one thought-object
        const hasThoughtObjects = convHighlights.length > 0 || convTasks.length > 0 || convDecisions.length > 0;
        
        // Prefer older conversations (stuck signals)
        const isOld = new Date(conv.created_at) < twoWeeksAgo;
        
        return hasThoughtObjects && isOld;
      })
      .slice(0, 3) || [];

    // Get project info for conversations to revisit
    const revisitConvIds = conversationsToRevisit.map((c) => c.id);
    let projectMap = new Map<string, { project_id: string; project_name: string }>();
    
    if (revisitConvIds.length > 0) {
      const { data: projectConversations, error: projectConvError } = await supabase
        .from('project_conversations')
        .select('conversation_id, project_id, projects(name)')
        .in('conversation_id', revisitConvIds);

      if (projectConvError) {
        console.error('Error fetching project conversations:', projectConvError);
      } else {
        projectConversations?.forEach((pc: any) => {
          if (pc.project_id && pc.projects) {
            projectMap.set(pc.conversation_id, {
              project_id: pc.project_id,
              project_name: pc.projects.name,
            });
          }
        });
      }
    }

    const thingsToRevisit = conversationsToRevisit.map((conv) => {
      const projectInfo = projectMap.get(conv.id);
      return {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        updated_at: conv.ended_at || conv.created_at,
        project_id: projectInfo?.project_id || null,
        project_name: projectInfo?.project_name || null,
      };
    });

    // Check if user has any conversations or projects (for empty state)
    // For empty state check, include all (active and inactive, business and personal)
    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get user's weekly digest email preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('weekly_digest_enabled')
      .eq('id', user.id)
      .single();

    try {
      return NextResponse.json({
        success: true,
        hasConversations: (conversationCount || 0) > 0,
        hasProjects: (projectCount || 0) > 0,
        priorityItems: {
          tasks: (allTasks || []).map((t: any) => ({
            id: t.id,
            title: t.title || 'Untitled Task',
            description: t.description || null,
            status: t.status || 'open',
            project_id: t.project_id || null,
            project_name: (t.projects as any)?.name || null,
            conversation_id: t.conversation_id || null,
            created_at: t.created_at,
            source_query: t.source_query || null,
          })),
          decisions: (recentDecisions || []).map((d: any) => ({
            id: d.id,
            title: d.title || 'Untitled Decision',
            content: d.content || null,
            conversation_id: d.conversation_id || null,
            conversation_title: (d.conversations as any)?.title || null,
            project_id: d.project_id || null,
            project_name: (d.projects as any)?.name || null,
            created_at: d.created_at,
          })),
        },
        latestInsights: (recentHighlights || []).map((h: any) => ({
          id: h.id,
          content: h.content,
          label: h.label,
          conversation_id: h.conversation_id,
          conversation_title: (h.conversations as any)?.title || null,
          created_at: h.created_at,
        })),
        thingsToRevisit: thingsToRevisit || [],
        latestDigest: latestDigest ? {
          id: latestDigest.id,
          week_start: latestDigest.week_start,
          week_end: latestDigest.week_end,
          summary: latestDigest.summary,
          top_themes: latestDigest.top_themes,
          open_loops: latestDigest.open_loops,
        } : null,
        weekly_digest_enabled: profile?.weekly_digest_enabled ?? true,
      });
    } catch (jsonError) {
      console.error('Error serializing response:', jsonError);
      throw jsonError;
    }
  } catch (error) {
    console.error('Home data API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch home data' },
      { status: 500 }
    );
  }
}

