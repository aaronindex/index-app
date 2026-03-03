// app/api/projects/[projectId]/outcomes/route.ts
// Record an immutable, user-authored outcome (result) for a project.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { dispatchStructureRecompute } from '@/lib/structure/dispatch';

function isDevEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
  );
}

type OutcomeRequestBody = {
  text?: string;
  occurred_at?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const supabase = await getSupabaseServerClient();

    const body = (await request.json().catch(() => ({}))) as OutcomeRequestBody;
    let text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json(
        { error: 'Outcome text is required.' },
        { status: 400 }
      );
    }

    if (text.length > 140) {
      return NextResponse.json(
        { error: 'Outcome text must be 140 characters or fewer.' },
        { status: 400 }
      );
    }

    if (/[\\n\\r]/.test(text)) {
      return NextResponse.json(
        { error: 'Outcome must be a single line (no newlines).' },
        { status: 400 }
      );
    }

    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < 3) {
      return NextResponse.json(
        { error: 'Please write at least three words to describe the outcome.' },
        { status: 400 }
      );
    }

    let occurredAt: string | undefined;
    if (body.occurred_at) {
      const parsed = new Date(body.occurred_at);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'occurred_at must be a valid ISO timestamp.' },
          { status: 400 }
        );
      }
      occurredAt = parsed.toISOString();
    }

    const insertPayload: any = {
      user_id: user.id,
      project_id: projectId,
      text,
    };

    if (occurredAt) {
      insertPayload.occurred_at = occurredAt;
    }

    const { data: outcome, error: insertError } = await supabase
      .from('project_outcome')
      .insert(insertPayload)
      .select('id, project_id, occurred_at')
      .single();

    if (insertError || !outcome) {
      return NextResponse.json(
        {
          error:
            insertError?.message || 'Failed to record outcome.',
        },
        { status: 500 }
      );
    }

    if (isDevEnv()) {
      // eslint-disable-next-line no-console
      console.log('[Outcome][Inserted]', {
        user_id: user.id,
        project_id: projectId,
        outcome_id: outcome.id,
      });
    }

    // Enqueue structure recompute (project-scoped) so snapshots/timeline can update.
    const debounceKey = `project:${projectId}:outcome_recorded`;

    try {
      await dispatchStructureRecompute({
        supabaseClient: supabase,
        user_id: user.id,
        scope: 'project',
        project_id: projectId,
        reason: 'outcome_recorded',
        debounce_key: debounceKey,
      });

      if (isDevEnv()) {
        // eslint-disable-next-line no-console
        console.log('[Outcome][RecomputeEnqueued]', {
          user_id: user.id,
          project_id: projectId,
        });
      }
    } catch (enqueueError) {
      if (isDevEnv()) {
        // eslint-disable-next-line no-console
        console.error('[Outcome][RecomputeEnqueueFailed]', {
          user_id: user.id,
          project_id: projectId,
          error_message:
            enqueueError instanceof Error
              ? enqueueError.message
              : String(enqueueError),
        });
      }

      return NextResponse.json(
        {
          error: 'Failed to enqueue structure recompute after recording outcome.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: outcome.id,
        project_id: outcome.project_id,
        occurred_at: outcome.occurred_at,
      },
      { status: 201 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Outcome][UnexpectedError]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to record outcome.',
      },
      { status: 500 }
    );
  }
}

// Manual test (example):
// curl -X POST "https://YOUR_DEPLOYMENT/api/projects/PROJECT_UUID/outcomes" \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
//   -d '{"text":"INDEX v2 launched publicly","occurred_at":"2026-03-03T18:02:00.000Z"}'

