// app/api/assets/[id]/toggle-inactive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { is_inactive } = body;

    if (typeof is_inactive !== 'boolean') {
      return NextResponse.json({ error: 'is_inactive must be a boolean' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Verify asset belongs to user
    const { data: existingAsset, error: fetchError } = await supabase
      .from('project_assets')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Update is_inactive
    const { data: asset, error: updateError } = await supabase
      .from('project_assets')
      .update({ is_inactive })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Toggle inactive error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update asset' },
      { status: 500 }
    );
  }
}

