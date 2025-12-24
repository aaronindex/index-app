// app/api/themes/week/route.ts
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

    // Get date range (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get themes created or updated this week (not filtered by conversation created_at)
    const { data: themes } = await supabase
      .from('themes')
      .select(`
        id,
        name,
        description,
        weight,
        updated_at,
        theme_conversations(
          conversation_id
        )
      `)
      .eq('user_id', user.id)
      .or(`created_at.gte.${weekAgo.toISOString()},updated_at.gte.${weekAgo.toISOString()}`)
      .order('weight', { ascending: false })
      .limit(10);

    // Get top tags from this week
    const { data: topTags } = await supabase
      .from('conversation_tags')
      .select(`
        tag_id,
        tags!inner(
          id,
          name,
          category
        ),
        conversation_id,
        conversations!inner(
          created_at
        )
      `)
      .eq('conversations.user_id', user.id)
      .gte('conversations.created_at', weekAgo.toISOString())
      .order('confidence', { ascending: false })
      .limit(20);

    // Aggregate tag counts
    const tagCounts = new Map<string, { name: string; category: string; count: number }>();
    topTags?.forEach((ct) => {
      const tag = ct.tags;
      if (tag) {
        const key = `${tag.name}-${tag.category}`;
        const current = tagCounts.get(key) || { name: tag.name, category: tag.category, count: 0 };
        tagCounts.set(key, { ...current, count: current.count + 1 });
      }
    });

    const topTagsList = Array.from(tagCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      themes: themes?.map((theme: any) => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        weight: theme.weight,
        conversationCount: Array.isArray(theme.theme_conversations) ? theme.theme_conversations.length : 0,
      })) || [],
      topTags: topTagsList,
    });
  } catch (error) {
    console.error('Get themes/week error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

