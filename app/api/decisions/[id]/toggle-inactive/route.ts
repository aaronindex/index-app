// app/api/decisions/[id]/toggle-inactive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

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

    // Verify decision belongs to user
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select('id, is_inactive')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (decisionError || !decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    // Toggle is_inactive
    const { data: updatedDecision, error: updateError } = await supabase
      .from('decisions')
      .update({ is_inactive: !decision.is_inactive })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedDecision) {
      console.error('Error toggling decision inactive flag:', updateError);
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update decision' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, decision: updatedDecision });
  } catch (error) {
    console.error('Toggle decision inactive error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle decision inactive flag' },
      { status: 500 }
    );
  }
}

