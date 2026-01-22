// app/api/conversations/define-roles/route.ts
// API endpoint to update message roles and handle splits in a conversation

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
    const { conversationId, messages, originalMessageIds } = body;

    if (!conversationId || !Array.isArray(messages)) {
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

    // Get existing messages
    const { data: existingMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id, index_in_conversation')
      .eq('conversation_id', conversationId)
      .order('index_in_conversation', { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    const existingMessageIds = new Set(existingMessages?.map((m) => m.id) || []);
    const newMessageIds = new Set(messages.map((m: any) => m.id).filter((id: string) => !id.startsWith('temp-')));
    const originalIds = new Set(originalMessageIds || []);

    // Validate roles
    const validRoles = ['user', 'assistant', 'system', 'tool'];
    for (const msg of messages) {
      if (!validRoles.includes(msg.role)) {
        return NextResponse.json(
          { error: `Invalid role: ${msg.role}` },
          { status: 400 }
        );
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return NextResponse.json(
          { error: 'Invalid message content' },
          { status: 400 }
        );
      }
    }

    // Delete messages that are no longer in the new array (but were in original)
    const messagesToDelete = existingMessages?.filter(
      (m) => originalIds.has(m.id) && !newMessageIds.has(m.id)
    ) || [];

    if (messagesToDelete.length > 0) {
      const deleteIds = messagesToDelete.map((m) => m.id);
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .in('id', deleteIds)
        .eq('conversation_id', conversationId);

      if (deleteError) {
        console.error('Error deleting messages:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete messages' },
          { status: 500 }
        );
      }
    }

    // Process messages: update existing, create new ones
    const updatePromises: Promise<any>[] = [];
    const inserts: any[] = [];

    for (const msg of messages) {
      if (msg.id.startsWith('temp-')) {
        // New message from split - insert
        inserts.push({
          conversation_id: conversationId,
          role: msg.role,
          content: msg.content,
          index_in_conversation: msg.index_in_conversation,
          source_message_id: null,
          raw_payload: null,
        });
      } else if (existingMessageIds.has(msg.id)) {
        // Existing message - update role, content, and index
        // Supabase queries are thenable, so we can use them directly with Promise.all
        // Type assertion needed because TypeScript doesn't recognize PostgrestFilterBuilder as Promise
        updatePromises.push(
          (supabase
            .from('messages')
            .update({
              role: msg.role,
              content: msg.content,
              index_in_conversation: msg.index_in_conversation,
            })
            .eq('id', msg.id)
            .eq('conversation_id', conversationId) as unknown) as Promise<any>
        );
      }
    }

    // Execute updates
    if (updatePromises.length > 0) {
      const updateResults = await Promise.all(updatePromises);
      const updateErrors = updateResults.filter((r) => r.error);
      if (updateErrors.length > 0) {
        console.error('Errors updating messages:', updateErrors);
        return NextResponse.json(
          { error: 'Failed to update some messages' },
          { status: 500 }
        );
      }
    }

    // Execute inserts
    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('messages')
        .insert(inserts);

      if (insertError) {
        console.error('Error inserting messages:', insertError);
        return NextResponse.json(
          { error: 'Failed to create new messages' },
          { status: 500 }
        );
      }
    }

    // Note: We don't delete chunks/embeddings here - they'll be regenerated on next use
    // or we could trigger a background job to re-chunk, but that's out of scope for now

    return NextResponse.json({
      success: true,
      updated: updatePromises.length,
      created: inserts.length,
      deleted: messagesToDelete.length,
    });
  } catch (error) {
    console.error('Error in define-roles API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
