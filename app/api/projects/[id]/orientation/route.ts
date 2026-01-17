// app/api/projects/[id]/orientation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orientation } = body;

    if (typeof orientation !== 'string') {
      return NextResponse.json({ error: 'Orientation must be a string' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Verify project belongs to user and update description
    const { data: project, error } = await supabase
      .from('projects')
      .update({ description: orientation.trim() || null })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, description')
      .single();

    if (error || !project) {
      return NextResponse.json(
        { error: error?.message || 'Project not found' },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ success: true, orientation: project.description });
  } catch (error) {
    console.error('Error updating project orientation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

