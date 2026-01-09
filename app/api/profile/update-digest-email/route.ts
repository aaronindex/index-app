// app/api/profile/update-digest-email/route.ts
// Update weekly_digest_enabled preference

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
    const { weekly_digest_enabled } = body;

    if (typeof weekly_digest_enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'weekly_digest_enabled must be a boolean' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ weekly_digest_enabled })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError || !profile) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error('Update digest email preference error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update preference' },
      { status: 500 }
    );
  }
}

