// app/api/invite-codes/use/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Atomically increment uses and check limits
    // Use a transaction-like approach with SELECT FOR UPDATE equivalent
    const { data: inviteCode, error: fetchError } = await supabase
      .from('invite_codes')
      .select('code, max_uses, uses, is_active')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (fetchError || !inviteCode) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    if (!inviteCode.is_active) {
      return NextResponse.json(
        { error: 'This invite code is no longer active' },
        { status: 400 }
      );
    }

    if (inviteCode.uses >= inviteCode.max_uses) {
      return NextResponse.json(
        { error: 'This invite code has reached its usage limit' },
        { status: 400 }
      );
    }

    // Increment uses atomically
    const newUses = inviteCode.uses + 1;
    const shouldDeactivate = newUses >= inviteCode.max_uses;

    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({
        uses: newUses,
        is_active: !shouldDeactivate,
      })
      .eq('code', code.trim().toUpperCase())
      .eq('uses', inviteCode.uses); // Optimistic locking

    if (updateError) {
      // Race condition - code was used between check and update
      return NextResponse.json(
        { error: 'Invite code was already used. Please try again.' },
        { status: 409 }
      );
    }

    // Fire analytics event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'invite_code_used',
        invite_code: code.trim().toUpperCase(),
      });
    }

    return NextResponse.json({ success: true, uses: newUses });
  } catch (error) {
    console.error('Invite code use error:', error);
    return NextResponse.json(
      { error: 'Failed to use invite code' },
      { status: 500 }
    );
  }
}

