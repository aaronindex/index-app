// app/api/projects/[id]/outcomes/route.ts
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
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
      occurred_at: occurredAt ?? new Date().toISOString(),
    };

    if (isDevEnv()) {
      console.log('[ProjectOutcome] insert payload:', insertPayload);
    }

    const { data: outcome, error: insertError } = await supabase
      .from('project_outcomes')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !outcome) {
      console.error('[ProjectOutcome] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record outcome.' },
        { status: 500 }
      );
    }

    // Fire-and-forget structure recompute for this project
    try {
      void dispatchStructureRecompute({
        supabaseClient: supabase,
        user_id: user.id,
        scope: 'project',
        project_id: projectId,
        reason: 'ingestion',
      });
    } catch (err) {
      console.error('[ProjectOutcome] Failed to dispatch structure recompute:', err);
    }

    return NextResponse.json(
      {
        success: true,
        outcome: {
          id: outcome.id,
          text: outcome.text,
          occurred_at: outcome.occurred_at,
          created_at: outcome.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[ProjectOutcome] Unexpected error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to record project outcome.',
      },
      { status: 500 }
    );
  }
}

