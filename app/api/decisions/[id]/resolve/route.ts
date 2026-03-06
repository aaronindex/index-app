// app/api/decisions/[id]/resolve/route.ts
// Phase 2a: Set decision status to 'closed' (canonical resolve).
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

    if (decision.status === 'closed') {
      return NextResponse.json({ success: true, decision: { id, status: 'closed' } });
    }

    const { data: updated, error: updateError } = await supabase
      .from('decisions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        is_inactive: true,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: (updateError && updateError.message) || 'Failed to resolve decision' },
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
    console.error('Resolve decision error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Resolve failed' },
      { status: 500 }
    );
  }
}
