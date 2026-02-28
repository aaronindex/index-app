// app/api/capture/route.ts
// Canonical Capture endpoint: creates capture conversation and (optionally) Reduce & Discard Source.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import type { CreateCaptureRequest } from '@/lib/capture/capture.types';
import { createCapture } from '@/lib/capture/createCapture';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateCaptureRequest;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    if (!body.container || (body.container.kind !== 'me' && body.container.kind !== 'project')) {
      return NextResponse.json({ error: 'Invalid container' }, { status: 400 });
    }

    if (body.container.kind === 'project' && !body.container.project_id) {
      return NextResponse.json(
        { error: 'project_id is required for project container' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    const result = await createCapture({
      supabase,
      userId: user.id,
      request: body,
    });

    return NextResponse.json({
      capture_id: result.capture_id,
      container: result.container,
      source_mode: result.source_mode,
      outcomes: result.outcomes,
      diagnostics: result.diagnostics,
      structure_job_enqueued: result.structure_job_enqueued,
    });
  } catch (error) {
    console.error('[Capture] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create capture' },
      { status: 500 }
    );
  }
}

