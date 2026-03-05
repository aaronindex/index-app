// app/api/home/data/route.ts
// Landing page data: Direction (global snapshot), Shifts (pulses), Timeline (pulses), Weekly Digest.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { getHomePageData } from '@/lib/ui-data/home-page-data';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();
    const data = await getHomePageData(supabase, user.id, false);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Home data API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch home data' },
      { status: 500 }
    );
  }
}
