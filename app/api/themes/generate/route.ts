// app/api/themes/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { clusterConversationsIntoThemes } from '@/lib/ai/themes';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationIds, minClusterSize = 2 } = body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return NextResponse.json(
        { error: 'conversationIds array is required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    console.log(`[Theme Generation] Starting for ${conversationIds.length} conversations`);

    // Check if chunks exist first
    const { count: chunkCount } = await supabase
      .from('message_chunks')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('user_id', user.id);

    console.log(`[Theme Generation] Found ${chunkCount || 0} chunks for conversations`);

    // Cluster conversations into themes
    const themeClusters = await clusterConversationsIntoThemes(
      user.id,
      conversationIds,
      minClusterSize
    );

    console.log(`[Theme Generation] Found ${themeClusters.length} theme clusters`);

    if (themeClusters.length === 0) {
      // Provide more helpful error message
      let errorMsg = 'No themes generated. ';
      if (!chunkCount || chunkCount === 0) {
        errorMsg += 'Conversations need to be chunked first (this should happen automatically during import). ';
      } else {
        errorMsg += `Found ${chunkCount} chunks but conversations may not be similar enough to cluster. `;
      }
      errorMsg += `Try with more conversations or conversations with more similar content.`;
      
      return NextResponse.json({
        success: false,
        themes: [],
        message: errorMsg,
        chunkCount: chunkCount || 0,
      }, { status: 200 }); // Return 200 so frontend can show the message
    }

    // Store themes in database
    const createdThemes: any[] = [];

    for (const cluster of themeClusters) {
      // Create theme (insert new, themes can have same name from different clusters)
      const { data: theme, error: themeError } = await supabase
        .from('themes')
        .insert({
          user_id: user.id,
          name: cluster.name,
          description: cluster.description,
          weight: cluster.weight,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (themeError || !theme) {
        console.error('[Theme Generation] Error creating theme:', themeError);
        continue;
      }

      console.log(`[Theme Generation] Created theme: ${theme.name} (${cluster.conversationIds.length} conversations)`);

      // Link conversations to theme
      const themeConversations = cluster.conversationIds.map((convId) => ({
        theme_id: theme.id,
        conversation_id: convId,
        relevance_score: cluster.weight,
      }));

      const { error: linkError } = await supabase.from('theme_conversations').upsert(themeConversations);
      if (linkError) {
        console.error('[Theme Generation] Error linking conversations to theme:', linkError);
      }

      createdThemes.push({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        weight: theme.weight,
        conversationCount: cluster.conversationIds.length,
      });
    }

    return NextResponse.json({
      success: true,
      themes: createdThemes,
    });
  } catch (error) {
    console.error('Generate themes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate themes' },
      { status: 500 }
    );
  }
}

