// app/api/debug/chunks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationIds = searchParams.get('conversationIds')?.split(',') || [];

    const supabase = await getSupabaseServerClient();

    if (conversationIds.length === 0) {
      // Get all conversations for user
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, title')
        .eq('user_id', user.id)
        .limit(10);

      const convIds = conversations?.map((c) => c.id) || [];

      // Get chunk counts per conversation
      const chunkCounts = await Promise.all(
        convIds.map(async (convId) => {
          const { count } = await supabase
            .from('message_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('user_id', user.id);

          return { conversationId: convId, chunkCount: count || 0 };
        })
      );

      return NextResponse.json({
        success: true,
        conversations: conversations?.map((c) => ({
          id: c.id,
          title: c.title,
          chunkCount: chunkCounts.find((cc) => cc.conversationId === c.id)?.chunkCount || 0,
        })),
      });
    }

    // Check chunks for specific conversations
    const { count: totalChunks } = await supabase
      .from('message_chunks')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id);

    const chunkCounts = await Promise.all(
      conversationIds.map(async (convId) => {
        const { count } = await supabase
          .from('message_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .eq('user_id', user.id);

        return { conversationId: convId, chunkCount: count || 0 };
      })
    );

    return NextResponse.json({
      success: true,
      totalChunks: totalChunks || 0,
      perConversation: chunkCounts,
    });
  } catch (error) {
    console.error('Debug chunks error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check chunks' },
      { status: 500 }
    );
  }
}

