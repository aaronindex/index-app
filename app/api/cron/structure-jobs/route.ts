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

/**
 * GET /api/cron/structure-jobs
 *
 * Called by Vercel Cron to process queued structure_jobs.
 *
 * Authentication (one required):
 * - Header: x-index-admin-secret matching INDEX_ADMIN_SECRET
 * - Header: Authorization: Bearer <INDEX_ADMIN_SECRET>
 *
 * In Vercel: set CRON_SECRET to the same value as INDEX_ADMIN_SECRET so Vercel sends Authorization: Bearer <secret>, or add header x-index-admin-secret in Cron Job config if supported.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = getAdminSecretFromRequest(request);
    const expectedSecret = process.env.INDEX_ADMIN_SECRET;

    if (!expectedSecret) {
      console.error('[CronStructureJobs] INDEX_ADMIN_SECRET not configured');
      return NextResponse.json(
        { error: 'Processor not configured' },
        { status: 500 }
      );
    }

    if (!secret || secret !== expectedSecret) {
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
