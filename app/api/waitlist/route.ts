// app/api/waitlist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderWaitlistConfirmationEmail } from '@/emails/waitlist-confirmation';
import { sendEmail } from '@/lib/email/resend';

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

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source = 'signed_out_lp' } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate source
    if (!source || typeof source !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Source is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    // UPSERT into waitlist (on conflict, update source if different, but don't error)
    // Use upsert to handle both new inserts and existing emails gracefully
    const { data: record, error: upsertError } = await supabase
      .from('lp_waitlist')
      .upsert(
        {
          email: trimmedEmail,
          source,
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false, // Update on conflict
        }
      )
      .select()
      .single();

    if (upsertError || !record) {
      console.error('Failed to upsert waitlist record:', upsertError);
      return NextResponse.json(
        { ok: false, error: 'Something went wrong. Try again.' },
        { status: 500 }
      );
    }

    const recordId = record.id;

    // Attempt to send confirmation email
    try {
      const emailHtml = renderWaitlistConfirmationEmail();

      const result = await sendEmail({
        to: trimmedEmail,
        subject: "You're on the INDEX early list",
        html: emailHtml,
      });

      if (!result.success) {
        console.error('Resend email error:', result.error);
        // Don't fail the request - user is still added to waitlist
        // Just don't update confirmed_at
      } else {
        // Email sent successfully - update confirmed_at and last_sent_at
        await supabase
          .from('lp_waitlist')
          .update({
            confirmed_at: new Date().toISOString(),
            last_sent_at: new Date().toISOString(),
          })
          .eq('id', recordId);
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request - user is still added to waitlist
      // Just don't update confirmed_at
    }

    // Always return success (even if email failed)
    // User is on the list regardless
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Waitlist signup error:', error);
    return NextResponse.json(
      { ok: false, error: 'Something went wrong. Try again.' },
      { status: 500 }
    );
  }
}

