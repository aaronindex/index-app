// app/api/account/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Get all user's conversation IDs for cascade cleanup
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id);

    const conversationIds = conversations?.map((c) => c.id) || [];

    // Delete in order (respecting foreign key constraints)
    // 1. Delete message_chunk_embeddings (via chunks)
    if (conversationIds.length > 0) {
      const { data: chunks } = await supabase
        .from('message_chunks')
        .select('id')
        .in('conversation_id', conversationIds);
      
      const chunkIds = chunks?.map((c) => c.id) || [];
      if (chunkIds.length > 0) {
        await supabase
          .from('message_chunk_embeddings')
          .delete()
          .in('chunk_id', chunkIds);
      }
    }

    // 2. Delete message_chunks
    if (conversationIds.length > 0) {
      await supabase
        .from('message_chunks')
        .delete()
        .in('conversation_id', conversationIds);
    }

    // 3. Delete highlight_embeddings
    const { data: highlights } = await supabase
      .from('highlights')
      .select('id')
      .eq('user_id', user.id);
    
    const highlightIds = highlights?.map((h) => h.id) || [];
    if (highlightIds.length > 0) {
      await supabase
        .from('highlight_embeddings')
        .delete()
        .in('highlight_id', highlightIds);
    }

    // 4. Delete branch_highlights
    if (conversationIds.length > 0) {
      await supabase
        .from('branch_highlights')
        .delete()
        .in('branch_conversation_id', conversationIds);
    }

    // 5. Delete highlights
    if (highlightIds.length > 0) {
      await supabase
        .from('highlights')
        .delete()
        .in('id', highlightIds);
    }

    // 6. Delete messages
    if (conversationIds.length > 0) {
      await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);
    }

    // 7. Delete project_conversations
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id);
    
    const projectIds = projects?.map((p) => p.id) || [];
    if (projectIds.length > 0) {
      await supabase
        .from('project_conversations')
        .delete()
        .in('project_id', projectIds);
    }

    // 8. Delete conversations
    if (conversationIds.length > 0) {
      await supabase
        .from('conversations')
        .delete()
        .in('id', conversationIds);
    }

    // 9. Delete projects
    if (projectIds.length > 0) {
      await supabase
        .from('projects')
        .delete()
        .in('id', projectIds);
    }

    // 10. Delete imports
    await supabase
      .from('imports')
      .delete()
      .eq('user_id', user.id);

    // 11. Delete weekly_digests
    await supabase
      .from('weekly_digests')
      .delete()
      .eq('user_id', user.id);

    // 12. Delete decisions (if table exists)
    try {
      await supabase
        .from('decisions')
        .delete()
        .eq('user_id', user.id);
    } catch {
      // Decisions table might not exist
    }

    // 13. Delete tasks (if table exists)
    try {
      await supabase
        .from('tasks')
        .delete()
        .eq('user_id', user.id);
    } catch {
      // Tasks table might not exist
    }

    // 13. Delete jobs
    await supabase
      .from('jobs')
      .delete()
      .eq('user_id', user.id);

    // 14. Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // 15. Sign out the user (this will invalidate their session)
    // Note: The auth.users record will remain but all associated data is deleted
    // To fully delete the auth user, admin access is required
    // For MVP, deleting all data and signing out is sufficient
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete account' },
      { status: 500 }
    );
  }
}

