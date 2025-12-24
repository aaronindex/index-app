// app/api/conversations/[id]/tag/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { extractTagsFromConversation } from '@/lib/ai/tagging';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    // Get conversation and messages
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, title, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', id)
      .order('index_in_conversation', { ascending: true });

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages found' }, { status: 400 });
    }

    // Extract tags using LLM
    const taggingResult = await extractTagsFromConversation(conversation.title, messages);

    // Store tags and link to conversation
    const tagIds: string[] = [];

    for (const tag of taggingResult.tags) {
      // Get or create tag
      let { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', tag.name)
        .eq('category', tag.category)
        .single();

      let tagId: string;

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert({
            user_id: user.id,
            name: tag.name,
            category: tag.category,
          })
          .select()
          .single();

        if (tagError || !newTag) {
          console.error('Error creating tag:', tagError);
          continue;
        }

        tagId = newTag.id;
      }

      tagIds.push(tagId);

      // Link tag to conversation
      await supabase
        .from('conversation_tags')
        .upsert({
          conversation_id: id,
          tag_id: tagId,
          confidence: tag.confidence || 0.7,
        });
    }

    return NextResponse.json({
      success: true,
      tags: taggingResult.tags,
      suggestedProjectName: taggingResult.suggestedProjectName,
      suggestedProjectDescription: taggingResult.suggestedProjectDescription,
    });
  } catch (error) {
    console.error('Tag conversation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to tag conversation' },
      { status: 500 }
    );
  }
}

