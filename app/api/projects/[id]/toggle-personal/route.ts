// app/api/projects/[id]/toggle-personal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, is_personal')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Toggle is_personal
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ is_personal: !project.is_personal })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedProject) {
      console.error('Error toggling project personal flag:', updateError);
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error('Toggle project personal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle project personal flag' },
      { status: 500 }
    );
  }
}

