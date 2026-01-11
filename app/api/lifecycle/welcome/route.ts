// app/api/lifecycle/welcome/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { renderWelcomeEmail } from '@/emails/welcome';

// Lazy initialization for Resend
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

// Get Supabase service role client (bypasses RLS)
function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role credentials not configured');
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check if lifecycle emails are enabled
    const lifecycleEmailsEnabled = process.env.LIFECYCLE_EMAILS_ENABLED !== 'false';
    if (!lifecycleEmailsEnabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'lifecycle_emails_disabled' });
    }

    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();

    // Get profile with welcome_email_sent_at
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, welcome_email_sent_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Failed to load profile:', profileError);
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }

    // Check if welcome email already sent
    if (profile.welcome_email_sent_at) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already_sent' });
    }

    // Get user email from auth.users (via the user object from getCurrentUser)
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Send welcome email
    try {
      const resend = getResend();
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'INDEX <hello@indexapp.co>';
      const emailHtml = renderWelcomeEmail();

      const result = await resend.emails.send({
        from: fromEmail,
        to: userEmail,
        subject: 'Welcome to INDEX',
        html: emailHtml,
      });

      if (result.error) {
        console.error('Resend email error:', result.error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }

      // Update profile with welcome_email_sent_at
      await supabase
        .from('profiles')
        .update({
          welcome_email_sent_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      return NextResponse.json({ ok: true });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  } catch (error) {
    console.error('Welcome email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

