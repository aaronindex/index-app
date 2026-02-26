// app/api/structure-jobs/process/route.ts
// Manual processor endpoint for structure_jobs (used by dev UI button)

import { NextRequest, NextResponse } from 'next/server';
import { processStructureJobQueue } from '@/lib/structure/jobs/process-queue';

/**
 * POST /api/structure-jobs/process
 *
 * Processes queued structure_jobs.
 *
 * Authentication:
 * - Requires header `x-index-admin-secret` matching `INDEX_ADMIN_SECRET` env var
 *
 * Body (optional):
 * - limit?: number (default 5, max 25)
 *
 * Behavior:
 * - Finds up to `limit` queued jobs (oldest first), runs each via runStructureJob
 * - Returns summary with job IDs arrays
 */
export async function POST(request: NextRequest) {
  try {
    const adminSecret = request.headers.get('x-index-admin-secret');
    const expectedSecret = process.env.INDEX_ADMIN_SECRET;

    if (!expectedSecret) {
      console.error('[StructureJobsProcess] INDEX_ADMIN_SECRET not configured');
      return NextResponse.json(
        { error: 'Processor not configured' },
        { status: 500 }
      );
    }

    if (!adminSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let limit = 5;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.limit && typeof body.limit === 'number') {
        limit = Math.min(Math.max(1, body.limit), 25);
      }
    } catch {
      // use default
    }

    const result = await processStructureJobQueue(limit);

    return NextResponse.json({
      processed: result.processed,
      job_ids: result.job_ids,
      succeeded: result.succeeded,
      failed: result.failed,
    });
  } catch (error) {
    console.error('[StructureJobsProcess] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
