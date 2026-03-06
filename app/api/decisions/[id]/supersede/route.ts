// app/api/decisions/[id]/supersede/route.ts
// Phase 2a: Mark this decision as superseded by another (superseded_by_decision_id).
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { dispatchStructureRecompute } from '@/lib/structure/dispatch';

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
    const body = await request.json().catch(() => ({}));
    const supersededByDecisionId = body.superseded_by_decision_id as string | undefined;

    if (!supersededByDecisionId || typeof supersededByDecisionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid superseded_by_decision_id' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    const { data: decision, error: fetchError } = await supabase
      .from('decisions')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    const { data: newDecision, error: newError } = await supabase
      .from('decisions')
      .select('id')
      .eq('id', supersededByDecisionId)
      .eq('user_id', user.id)
      .single();

    if (newError || !newDecision) {
      return NextResponse.json({ error: 'Superseding decision not found or access denied' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('decisions')
      .update({
        status: 'superseded',
        superseded_by_decision_id: supersededByDecisionId,
        is_inactive: true,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to supersede decision' },
        { status: 500 }
      );
    }

    try {
      await dispatchStructureRecompute({
        supabaseClient: supabase,
        user_id: user.id,
        scope: 'user',
        reason: 'decision_change',
      });
    } catch (_) {
      // non-fatal
    }

    return NextResponse.json({ success: true, decision: updated });
  } catch (error) {
    console.error('Supersede decision error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Supersede failed' },
      { status: 500 }
    );
  }
}
