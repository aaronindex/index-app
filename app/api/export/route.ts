// app/api/export/route.ts
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

    // Export all user data
    const exportData: any = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      profile: null,
      projects: [],
      conversations: [],
      messages: [],
      highlights: [],
      imports: [],
      weekly_digests: [],
      decisions: [],
      tasks: [],
    };

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    exportData.profile = profile;

    // Get projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id);
    exportData.projects = projects || [];

    // Get project conversations mapping
    const projectIds = projects?.map((p) => p.id) || [];
    const projectConversationsMap = new Map<string, string[]>();
    if (projectIds.length > 0) {
      const { data: projectConvs } = await supabase
        .from('project_conversations')
        .select('project_id, conversation_id')
        .in('project_id', projectIds);
      
      projectConvs?.forEach((pc) => {
        const existing = projectConversationsMap.get(pc.project_id) || [];
        existing.push(pc.conversation_id);
        projectConversationsMap.set(pc.project_id, existing);
      });
    }

    // Get conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id);
    exportData.conversations = conversations || [];

    // Get messages for all conversations
    const conversationIds = conversations?.map((c) => c.id) || [];
    if (conversationIds.length > 0) {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('conversation_id, index_in_conversation');
      exportData.messages = messages || [];
    }

    // Get highlights
    const { data: highlights } = await supabase
      .from('highlights')
      .select('*')
      .eq('user_id', user.id);
    exportData.highlights = highlights || [];

    // Get branch highlights
    const highlightIds = highlights?.map((h) => h.id) || [];
    const branchHighlightsMap = new Map<string, string[]>();
    if (highlightIds.length > 0) {
      const { data: branchHighlights } = await supabase
        .from('branch_highlights')
        .select('branch_conversation_id, highlight_id')
        .in('highlight_id', highlightIds);
      
      branchHighlights?.forEach((bh) => {
        const existing = branchHighlightsMap.get(bh.branch_conversation_id) || [];
        existing.push(bh.highlight_id);
        branchHighlightsMap.set(bh.branch_conversation_id, existing);
      });
    }

    // Get imports
    const { data: imports } = await supabase
      .from('imports')
      .select('*')
      .eq('user_id', user.id);
    exportData.imports = imports || [];

    // Get weekly digests
    const { data: weeklyDigests } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('user_id', user.id);
    exportData.weekly_digests = weeklyDigests || [];

    // Get decisions (if table exists)
    try {
      const { data: decisions } = await supabase
        .from('decisions')
        .select('*')
        .eq('user_id', user.id);
      exportData.decisions = decisions || [];
    } catch {
      // Decisions table might not exist yet
      exportData.decisions = [];
    }

    // Get tasks (if table exists)
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
      exportData.tasks = tasks || [];
    } catch {
      // Tasks table might not exist yet
      exportData.tasks = [];
    }

    // Add project conversation mappings to projects
    exportData.projects = exportData.projects.map((project: any) => ({
      ...project,
      conversation_ids: projectConversationsMap.get(project.id) || [],
    }));

    // Add branch highlight mappings to conversations
    exportData.conversations = exportData.conversations.map((conv: any) => ({
      ...conv,
      branch_highlight_ids: branchHighlightsMap.get(conv.id) || [],
    }));

    // Return as JSON download
    const jsonString = JSON.stringify(exportData, null, 2);
    const filename = `index-export-${user.id}-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

