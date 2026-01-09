// app/api/decisions/pin/route.ts
// Pin/unpin a decision (max one pinned decision per project)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { decisionId, pinned } = body;

    if (typeof pinned !== 'boolean') {
      return NextResponse.json({ error: 'pinned must be a boolean' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Get decision to verify ownership and get project_id
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select('id, project_id, user_id')
      .eq('id', decisionId)
      .eq('user_id', user.id)
      .single();

    if (decisionError || !decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    // If pinning, unpin any other pinned decision in the same project
    if (pinned && decision.project_id) {
      await supabase
        .from('decisions')
        .update({ is_pinned: false })
        .eq('project_id', decision.project_id)
        .eq('user_id', user.id)
        .neq('id', decisionId)
        .eq('is_pinned', true);
    }

    // Update decision pin status
    const { data: updatedDecision, error: updateError } = await supabase
      .from('decisions')
      .update({ is_pinned: pinned })
      .eq('id', decisionId)
      .select()
      .single();

    if (updateError || !updatedDecision) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update decision' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, decision: updatedDecision });
  } catch (error) {
    console.error('Pin decision error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pin decision' },
      { status: 500 }
    );
  }
}

