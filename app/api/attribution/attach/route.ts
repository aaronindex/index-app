// app/api/attribution/attach/route.ts
// Attach attribution data to user profile (first-touch only)

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      initial_referrer,
      initial_landing_path,
    } = body;

    const supabase = await getSupabaseServerClient();

    // Get current profile to check if attribution already set
    const { data: profile } = await supabase
      .from('profiles')
      .select('utm_source, utm_medium, utm_campaign, utm_content, utm_term, initial_referrer, initial_landing_path')
      .eq('id', user.id)
      .single();

    // Only update if attribution fields are currently null (first-touch only)
    const updates: Record<string, any> = {};

    if (!profile?.utm_source && utm_source) updates.utm_source = utm_source;
    if (!profile?.utm_medium && utm_medium) updates.utm_medium = utm_medium;
    if (!profile?.utm_campaign && utm_campaign) updates.utm_campaign = utm_campaign;
    if (!profile?.utm_content && utm_content) updates.utm_content = utm_content;
    if (!profile?.utm_term && utm_term) updates.utm_term = utm_term;
    if (!profile?.initial_referrer && initial_referrer) updates.initial_referrer = initial_referrer;
    if (!profile?.initial_landing_path && initial_landing_path) {
      updates.initial_landing_path = initial_landing_path;
      updates.initial_utm_captured_at = new Date().toISOString();
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Attach attribution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

