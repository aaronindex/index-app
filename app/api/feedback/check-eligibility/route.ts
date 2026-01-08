// app/api/feedback/check-eligibility/route.ts
// Check if user is eligible for feedback modal (has used INDEX enough)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ eligible: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Check conditions:
    // 1. User has created at least one project
    // 2. User has imported 2+ conversations
    // 3. User has created at least one task or decision

    const [projectsResult, conversationsResult, tasksResult, decisionsResult] = await Promise.all([
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_personal', false),
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_inactive', false),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_inactive', false),
      supabase
        .from('decisions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_inactive', false),
    ]);

    const projectCount = projectsResult.count || 0;
    const conversationCount = conversationsResult.count || 0;
    const taskCount = tasksResult.count || 0;
    const decisionCount = decisionsResult.count || 0;
    const artifactCount = taskCount + decisionCount;

    const eligible =
      projectCount >= 1 && conversationCount >= 2 && artifactCount >= 1;

    return NextResponse.json({
      eligible,
      counts: {
        projects: projectCount,
        conversations: conversationCount,
        tasks: taskCount,
        decisions: decisionCount,
        artifacts: artifactCount,
      },
    });
  } catch (error) {
    console.error('Feedback eligibility check error:', error);
    return NextResponse.json(
      { eligible: false, error: error instanceof Error ? error.message : 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}

