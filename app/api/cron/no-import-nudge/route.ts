// app/api/cron/no-import-nudge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { renderNoImportNudgeEmail } from '@/emails/no-import-nudge';

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

export async function GET(request: NextRequest) {
  try {
    // Check if lifecycle emails are enabled
    const lifecycleEmailsEnabled = process.env.LIFECYCLE_EMAILS_ENABLED !== 'false';
    if (!lifecycleEmailsEnabled) {
      return NextResponse.json({ ok: true, processed: 0, nudged: 0, skipped: 0, reason: 'lifecycle_emails_disabled' });
    }

    // Verify cron authentication
    const cronHeader = request.headers.get('x-vercel-cron');
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.CRON_TOKEN;

    const isVercelCron = cronHeader === '1';
    const isTokenValid = expectedToken && token === expectedToken;

    if (!isVercelCron && !isTokenValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceClient();
    const nudgeDays = parseInt(process.env.NO_IMPORT_NUDGE_DAYS || '3', 10);
    const batchSize = 200;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://indexapp.co';

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - nudgeDays);
    const cutoffDateISO = cutoffDate.toISOString();

    // Query eligible users:
    // - welcome_email_sent_at is not null (optional but preferred)
    // - no_import_nudge_sent_at is null
    // - created_at <= cutoffDate (account is old enough)
    // - No imports exist for this user
    const { data: eligibleProfiles, error: queryError } = await supabase
      .from('profiles')
      .select('id, created_at, welcome_email_sent_at')
      .not('welcome_email_sent_at', 'is', null) // Optional but preferred
      .is('no_import_nudge_sent_at', null)
      .lte('created_at', cutoffDateISO)
      .limit(batchSize);

    if (queryError) {
      console.error('Error querying eligible profiles:', queryError);
      return NextResponse.json({ error: 'Failed to query profiles' }, { status: 500 });
    }

    if (!eligibleProfiles || eligibleProfiles.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, nudged: 0, skipped: 0 });
    }

    // Check which users have no imports
    const userIds = eligibleProfiles.map(p => p.id);
    const { data: importsByUser, error: importsError } = await supabase
      .from('imports')
      .select('user_id')
      .in('user_id', userIds);

    if (importsError) {
      console.error('Error querying imports:', importsError);
      return NextResponse.json({ error: 'Failed to query imports' }, { status: 500 });
    }

    const usersWithImports = new Set(importsByUser?.map(i => i.user_id) || []);
    const usersToNudge = eligibleProfiles.filter(p => !usersWithImports.has(p.id));

    if (usersToNudge.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        processed: eligibleProfiles.length, 
        nudged: 0, 
        skipped: eligibleProfiles.length 
      });
    }

    // Send nudge emails
    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'INDEX <hello@indexapp.co>';
    const emailHtml = renderNoImportNudgeEmail(siteUrl);

    // Get user emails from auth.users via admin API
    const userIdsToNudge = usersToNudge.map(p => p.id);
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
      return NextResponse.json({ error: 'Failed to fetch user emails' }, { status: 500 });
    }

    const userEmailMap = new Map<string, string>();
    authUsers?.users?.forEach(u => {
      if (u.email && userIdsToNudge.includes(u.id)) {
        userEmailMap.set(u.id, u.email);
      }
    });

    let nudged = 0;
    let failed = 0;

    for (const profile of usersToNudge) {
      const userEmail = userEmailMap.get(profile.id);
      if (!userEmail) {
        console.warn(`Skipping profile ${profile.id}: no email found in auth.users`);
        failed++;
        continue;
      }

      try {
        const result = await resend.emails.send({
          from: fromEmail,
          to: userEmail,
          subject: 'One small way to try INDEX',
          html: emailHtml,
        });

        if (result.error) {
          console.error(`Failed to send nudge email to ${userEmail}:`, result.error);
          failed++;
          continue;
        }

        // Update profile with no_import_nudge_sent_at
        await supabase
          .from('profiles')
          .update({
            no_import_nudge_sent_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        nudged++;
      } catch (emailError) {
        console.error(`Error sending nudge email to ${userEmail}:`, emailError);
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      processed: eligibleProfiles.length,
      nudged,
      skipped: eligibleProfiles.length - usersToNudge.length,
      failed,
    });
  } catch (error) {
    console.error('No-import nudge cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

