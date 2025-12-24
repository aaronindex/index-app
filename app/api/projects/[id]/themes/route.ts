// app/api/projects/[id]/themes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const supabase = await getSupabaseServerClient();

    // Get conversation IDs for this project
    const { data: projectConversations } = await supabase
      .from('project_conversations')
      .select('conversation_id')
      .eq('project_id', projectId);

    const conversationIds = projectConversations?.map((pc) => pc.conversation_id) || [];

    console.log(`[Project Themes API] Project ${projectId} has ${conversationIds.length} conversations`);

    if (conversationIds.length === 0) {
      return NextResponse.json({ success: true, themes: [] });
    }

    // Get all themes for user with their conversation links
    const { data: allThemes } = await supabase
      .from('themes')
      .select(`
        id,
        name,
        description,
        weight,
        theme_conversations(
          conversation_id
        )
      `)
      .eq('user_id', user.id)
      .order('weight', { ascending: false });

    if (!allThemes || allThemes.length === 0) {
      return NextResponse.json({ success: true, themes: [] });
    }

    // Filter themes that have conversations in this project
    const themes = allThemes
      .map((theme: any) => {
        const themeConvIds = Array.isArray(theme.theme_conversations)
          ? theme.theme_conversations.map((tc: any) => tc.conversation_id)
          : [];
        const projectConvIds = themeConvIds.filter((id: string) => conversationIds.includes(id));
        return {
          id: theme.id,
          name: theme.name,
          description: theme.description,
          weight: theme.weight,
          conversationCount: projectConvIds.length,
        };
      })
      .filter((theme) => theme.conversationCount > 0);

    console.log(`[Project Themes API] Returning ${themes.length} themes for project ${projectId}`);

    return NextResponse.json({
      success: true,
      themes: themes,
    });
  } catch (error) {
    console.error('Get project themes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

