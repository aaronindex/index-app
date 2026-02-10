// app/api/digests/[id]/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { sendDigestEmail } from '@/lib/email/digest';
import { checkEmailSendLimit, checkDigestEmailCooldown, incrementLimit } from '@/lib/limits';

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

    // Check email send limit
    const limitCheck = await checkEmailSendLimit(user.id);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || 'Email send limit reached' },
        { status: 429 }
      );
    }

    // Check cooldown
    const cooldownCheck = await checkDigestEmailCooldown(user.id, id);
    if (!cooldownCheck.allowed) {
      return NextResponse.json(
        { error: cooldownCheck.message || 'Please wait before sending again' },
        { status: 429 }
      );
    }

    // Get digest
    const { data: digest, error: digestError } = await supabase
      .from('weekly_digests')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (digestError || !digest) {
      return NextResponse.json({ error: 'Digest not found' }, { status: 404 });
    }

    // Get user email from auth
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Send email
    const emailResult = await sendDigestEmail(authUser.user.email, {
      summary: digest.summary,
      topThemes: (digest.top_themes as any) || [],
      openLoops: (digest.open_loops as any) || [],
      recommendedNextSteps: (digest.recommended_next_steps as any) || [],
      weekStart: digest.week_start,
      weekEnd: digest.week_end,
      userName: authUser.user.email,
      digestUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/digests/${digest.id}`,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update digest with email_sent_at
    await supabase
      .from('weekly_digests')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', id);

    // Increment email send limit counter
    await incrementLimit(user.id, 'email_send');

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
    });
  } catch (error) {
    console.error('Send digest email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

