// app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, message } = body;

    if (!type || !subject || !message) {
      return NextResponse.json(
        { error: 'Type, subject, and message are required' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // Get user email
    const { data: authUser } = await supabase.auth.getUser();
    const userEmail = authUser.user?.email || 'unknown@example.com';

    // Store feedback in database (optional - for tracking)
    // For now, we'll just email it

    // Send feedback email
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'INDEX <noreply@indexapp.co>';
    const feedbackEmail = process.env.FEEDBACK_EMAIL || 'aaron@indexapp.co';

    const emailSubject = `[Alpha Feedback - ${type}] ${subject}`;
    const emailBody = `
Feedback Type: ${type}
From: ${userEmail} (${user.id})
Subject: ${subject}

Message:
${message}

---
This feedback was submitted from INDEX alpha.
    `.trim();

    try {
      await resend.emails.send({
        from: fromEmail,
        to: feedbackEmail,
        replyTo: userEmail,
        subject: emailSubject,
        text: emailBody,
      });
    } catch (emailError) {
      console.error('Failed to send feedback email:', emailError);
      // Don't fail the request if email fails - we can still log it
    }

    return NextResponse.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

