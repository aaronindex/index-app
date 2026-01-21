// app/api/conversations/define-roles/route.ts
// API endpoint to update message roles in a conversation

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, roleUpdates } = body;

    if (!conversationId || !Array.isArray(roleUpdates)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify all message IDs belong to this conversation
    const { data: existingMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    const existingMessageIds = new Set(existingMessages?.map((m) => m.id) || []);
    const updateMessageIds = new Set(roleUpdates.map((u: any) => u.messageId));

    // Check all message IDs are valid
    for (const messageId of updateMessageIds) {
      if (!existingMessageIds.has(messageId)) {
        return NextResponse.json(
          { error: `Message ${messageId} not found in conversation` },
          { status: 400 }
        );
      }
    }

    // Validate roles
    const validRoles = ['user', 'assistant', 'system', 'tool'];
    for (const update of roleUpdates) {
      if (!validRoles.includes(update.role)) {
        return NextResponse.json(
          { error: `Invalid role: ${update.role}` },
          { status: 400 }
        );
      }
    }

    // Update messages in batch
    const updatePromises = roleUpdates.map((update: { messageId: string; role: string }) =>
      supabase
        .from('messages')
        .update({ role: update.role })
        .eq('id', update.messageId)
        .eq('conversation_id', conversationId)
    );

    const results = await Promise.all(updatePromises);
    
    // Check for errors
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Errors updating messages:', errors);
      return NextResponse.json(
        { error: 'Failed to update some messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: roleUpdates.length,
    });
  } catch (error) {
    console.error('Error in define-roles API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
