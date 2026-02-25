// app/api/thinking-time/resolve/route.ts
// Resolve thinking time for a conversation using coarse window selection
// Persists thinking window and dispatches structure recompute

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { coarseWindowToThinkingRange, type CoarseWindow } from '@/lib/time/coarseWindow';
import { dispatchStructureRecompute } from '@/lib/structure/dispatch';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id, choice } = body;

    if (!conversation_id || !choice) {
      return NextResponse.json(
        { error: 'Missing required fields: conversation_id, choice' },
        { status: 400 }
      );
    }

    if (!['today', 'yesterday', 'last_week', 'last_month'].includes(choice)) {
      return NextResponse.json(
        { error: 'Invalid choice. Must be: today, yesterday, last_week, last_month' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Compute thinking window from choice
    const nowIso = new Date().toISOString();
    const { start_at, end_at } = coarseWindowToThinkingRange({
      choice: choice as CoarseWindow,
      nowIso,
    });

    // Update conversation with thinking window
    // Use started_at and ended_at (canonical fields)
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        started_at: start_at,
        ended_at: end_at,
      })
      .eq('id', conversation_id);

    if (updateError) {
      console.error('[ThinkingTimeResolve] Error updating conversation:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update thinking time' },
        { status: 500 }
      );
    }

    // Dispatch structure recompute
    // Use "ingestion" reason since we're fixing conversation thinking time
    try {
      await dispatchStructureRecompute({
        supabaseClient: supabase,
        user_id: user.id,
        scope: 'user',
        reason: 'ingestion',
      });
    } catch (dispatchError) {
      // Log but don't fail the request if dispatch fails
      console.error('[ThinkingTimeResolve] Failed to dispatch structure recompute:', dispatchError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Thinking time resolve error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve thinking time' },
      { status: 500 }
    );
  }
}
