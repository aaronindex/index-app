// app/api/capsule/route.ts
// Read-only structural capsule export.
// Mirrors the latest snapshot_state row (state_hash + normalized state_payload) without mutation.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

type CapsuleResponse = {
  state_hash: string | null;
  state_payload: unknown | null;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scopeParam = searchParams.get('scope');
    const projectId = searchParams.get('project_id');

    let scope: 'global' | 'project' = 'global';

    if (scopeParam === 'project') {
      scope = 'project';
      if (!projectId) {
        return NextResponse.json(
          { error: 'project_id is required when scope=project' },
          { status: 400 }
        );
      }
    } else if (scopeParam && scopeParam !== 'global') {
      return NextResponse.json(
        { error: 'Invalid scope. Must be global or project.' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseServerClient();

    // For project scope, verify ownership first.
    if (scope === 'project' && projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    // Read latest snapshot_state row for this user/scope (and project_id if applicable).
    let query = supabase
      .from('snapshot_state')
      .select('state_hash, state_payload, generated_at, created_at')
      .eq('user_id', user.id)
      .eq('scope', scope)
      // Prefer generated_at for ordering, but fall back to created_at deterministically.
      .order('generated_at', { ascending: false, nullsLast: true })
      .order('created_at', { ascending: false })
      .limit(1);

    if (scope === 'project' && projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error('[Capsule] Error loading snapshot_state:', error);
      return NextResponse.json(
        { error: 'Failed to load capsule' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (
      data &&
      (process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development')
    ) {
      const generatedAt = (data as any).generated_at ?? null;
      if (!generatedAt) {
        // eslint-disable-next-line no-console
        console.warn('[Capsule][SnapshotMonotonicity][MissingGeneratedAt]', {
          user_id: user.id,
          scope,
          reason: 'generated_at_null',
        });
      }
    }

    const response: CapsuleResponse = data
      ? {
          state_hash: data.state_hash ?? null,
          state_payload: data.state_payload ?? null,
        }
      : {
          state_hash: null,
          state_payload: null,
        };

    return NextResponse.json(response, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[Capsule] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to load capsule' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

