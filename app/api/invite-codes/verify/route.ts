// app/api/invite-codes/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { ALPHA_MODE } from '@/lib/config/flags';

export async function POST(request: NextRequest) {
  try {
    // If ALPHA_MODE is false, bypass invite code validation
    if (!ALPHA_MODE) {
      return NextResponse.json({ valid: true });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Check if code exists and is valid
    const { data: inviteCode, error } = await supabase
      .from('invite_codes')
      .select('code, max_uses, uses, is_active')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (error || !inviteCode) {
      return NextResponse.json(
        { valid: false, error: 'Invalid invite code' },
        { status: 200 }
      );
    }

    if (!inviteCode.is_active) {
      return NextResponse.json(
        { valid: false, error: 'This invite code is no longer active' },
        { status: 200 }
      );
    }

    if (inviteCode.uses >= inviteCode.max_uses) {
      return NextResponse.json(
        { valid: false, error: 'This invite code has reached its usage limit' },
        { status: 200 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Invite code verification error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to verify invite code' },
      { status: 500 }
    );
  }
}

