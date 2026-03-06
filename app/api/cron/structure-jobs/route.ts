// app/api/cron/structure-jobs/route.ts
// Vercel Cron: process queued structure_jobs (no UI; auth via Bearer or x-index-admin-secret)

import { NextRequest, NextResponse } from 'next/server';
import { processStructureJobQueue } from '@/lib/structure/jobs/process-queue';

const CRON_LIMIT = 10;

function getAdminSecretFromRequest(request: NextRequest): string | null {
  const headerSecret = request.headers.get('x-index-admin-secret');
  if (headerSecret) return headerSecret;

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();

  return null;
}

function isCronAuthorized(secret: string | null, expectedAdmin: string | undefined, cronSecret: string | undefined): boolean {
  if (!secret) return false;
  if (expectedAdmin && secret === expectedAdmin) return true;
  if (cronSecret && secret === cronSecret) return true;
  return false;
}

/**
 * GET /api/cron/structure-jobs
 *
 * Called by Vercel Cron to process queued structure_jobs.
 *
 * Authentication (one required):
 * - Header: x-index-admin-secret matching INDEX_ADMIN_SECRET
 * - Header: Authorization: Bearer <INDEX_ADMIN_SECRET>
 *
 * In Vercel: set CRON_SECRET (Vercel may send it as Authorization: Bearer). We accept either Bearer token matching INDEX_ADMIN_SECRET or CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = getAdminSecretFromRequest(request);
    const expectedAdmin = process.env.INDEX_ADMIN_SECRET;
    const cronSecret = process.env.CRON_SECRET;

    if (!expectedAdmin && !cronSecret) {
      console.error('[CronStructureJobs] INDEX_ADMIN_SECRET or CRON_SECRET must be configured');
      return NextResponse.json(
        { error: 'Processor not configured' },
        { status: 500 }
      );
    }

    if (!isCronAuthorized(secret, expectedAdmin, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processStructureJobQueue(CRON_LIMIT);

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      job_ids: result.job_ids,
      succeeded: result.succeeded,
      failed: result.failed,
    });
  } catch (error) {
    console.error('[CronStructureJobs] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
