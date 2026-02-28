// app/api/admin/structure/health/route.ts
// Dev/admin-only health endpoint for structure_jobs and snapshot_state.
// Read-only diagnostics: no payloads, no inference, no mutation.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';

function getSupabaseServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
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

function isAdminEmail(userEmail: string | null | undefined): boolean {
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST;
  if (!allowlist || !userEmail) return false;

  const emails = allowlist
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return emails.includes(userEmail.toLowerCase());
}

const STUCK_SECONDS_DEFAULT = 600; // 10 minutes

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const stuckThresholdSeconds = STUCK_SECONDS_DEFAULT;
    const supabaseAdmin = getSupabaseServiceClient();

    const warnings: string[] = [];

    // ----------------------------------------------------------------------------
    // Jobs summary
    // ----------------------------------------------------------------------------
    const { data: queuedJobs } = await supabaseAdmin
      .from('structure_jobs')
      .select('id, queued_at')
      .eq('status', 'queued');

    const { data: runningJobs } = await supabaseAdmin
      .from('structure_jobs')
      .select('id, started_at')
      .eq('status', 'running');

    const { data: failedJobs } = await supabaseAdmin
      .from('structure_jobs')
      .select('id')
      .eq('status', 'failed');

    const queuedCount = queuedJobs?.length ?? 0;
    const runningCount = runningJobs?.length ?? 0;
    const failedCount = failedJobs?.length ?? 0;

    let oldestQueuedAgeSeconds: number | null = null;
    if (queuedJobs && queuedJobs.length > 0) {
      const oldestQueued = queuedJobs.reduce((oldest, job) => {
        const t = new Date(job.queued_at).getTime();
        const currentOldest = new Date(oldest.queued_at).getTime();
        return t < currentOldest ? job : oldest;
      }, queuedJobs[0]);
      oldestQueuedAgeSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(oldestQueued.queued_at).getTime()) / 1000)
      );
    }

    let oldestRunningAgeSeconds: number | null = null;
    let stuckCount = 0;
    if (runningJobs && runningJobs.length > 0) {
      let oldestRunning = runningJobs[0];
      for (const job of runningJobs) {
        const startedAtMs = new Date(job.started_at).getTime();
        const oldestMs = new Date(oldestRunning.started_at).getTime();
        if (startedAtMs < oldestMs) {
          oldestRunning = job;
        }
        const ageSeconds = Math.max(0, Math.floor((now.getTime() - startedAtMs) / 1000));
        if (ageSeconds > stuckThresholdSeconds) {
          stuckCount += 1;
        }
      }
      oldestRunningAgeSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(oldestRunning.started_at).getTime()) / 1000)
      );
    }

    if (stuckCount > 0) {
      warnings.push('stuck_jobs_detected');
    }

    // ----------------------------------------------------------------------------
    // Snapshot freshness summary
    // ----------------------------------------------------------------------------
    const { data: latestGlobalSnapshot } = await supabaseAdmin
      .from('snapshot_state')
      .select('state_hash, generated_at, created_at')
      .eq('scope', 'global')
      .order('generated_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const globalSnapshot = latestGlobalSnapshot
      ? {
          last_generated_at:
            (latestGlobalSnapshot as any).generated_at ??
            (latestGlobalSnapshot as any).created_at ??
            null,
          last_state_hash: latestGlobalSnapshot.state_hash ?? null,
        }
      : {
          last_generated_at: null,
          last_state_hash: null,
        };

    if (!latestGlobalSnapshot) {
      warnings.push('no_global_snapshots');
    }

    // Me scope does not exist as a separate snapshot scope yet; expose null for clarity.
    const meSnapshot = {
      last_generated_at: null as string | null,
      last_state_hash: null as string | null,
    };

    const { data: projectSnapshotsSample } = await supabaseAdmin
      .from('snapshot_state')
      .select('project_id, state_hash, generated_at, created_at')
      .eq('scope', 'project')
      .not('project_id', 'is', null)
      .order('generated_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
      .limit(10);

    const projectsSample =
      projectSnapshotsSample?.map((row) => ({
        project_id: row.project_id,
        last_generated_at:
          (row as any).generated_at ??
          (row as any).created_at ??
          null,
        last_state_hash: row.state_hash ?? null,
      })) ?? [];

    const ok = stuckCount === 0;

    const response = {
      now: nowIso,
      ok,
      jobs: {
        queued: queuedCount,
        running: runningCount,
        failed: failedCount,
        stuck: stuckCount,
        oldest_queued_age_seconds: oldestQueuedAgeSeconds,
        oldest_running_age_seconds: oldestRunningAgeSeconds,
        stuck_threshold_seconds: stuckThresholdSeconds,
      },
      snapshots: {
        global: globalSnapshot,
        me: meSnapshot,
        projects_sample: projectsSample,
      },
      warnings,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[StructureHealth] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

