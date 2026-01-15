// app/api/projects/[id]/export-checklist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';

export async function GET(
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
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get project conversations
    const { data: projectConversations } = await supabase
      .from('project_conversations')
      .select('conversation_id')
      .eq('project_id', id);

    const conversationIds = projectConversations?.map((pc) => pc.conversation_id) || [];

    // Get all decisions for this project (by project_id OR by conversation_id)
    let decisionsQuery = supabase
      .from('decisions')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .eq('is_inactive', false);

    if (conversationIds.length > 0) {
      decisionsQuery = decisionsQuery.or(`project_id.eq.${id},conversation_id.in.(${conversationIds.join(',')})`);
    } else {
      decisionsQuery = decisionsQuery.eq('project_id', id);
    }

    const { data: decisions } = await decisionsQuery
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    // Get all tasks for this project
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, status, created_at')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .eq('is_inactive', false)
      .order('is_pinned', { ascending: false })
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    // Build markdown content
    const lines: string[] = [];

    // Header
    lines.push(`# Project: ${project.name}`);
    lines.push('');
    if (project.description) {
      lines.push(project.description);
      lines.push('');
    }
    const exportDate = new Date().toISOString().split('T')[0];
    lines.push(`Exported from INDEX on ${exportDate}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Decisions
    if (decisions && decisions.length > 0) {
      lines.push('## Decisions');
      decisions.forEach((decision) => {
        lines.push(`- [x] ${decision.title}`);
      });
      lines.push('');
    }

    // Tasks
    if (tasks && tasks.length > 0) {
      lines.push('## Tasks');
      
      // Separate blockers from regular tasks
      const blockers: typeof tasks = [];
      const regularTasks: typeof tasks = [];
      
      tasks.forEach((task) => {
        if (task.description?.includes('[Blocker]')) {
          blockers.push(task);
        } else {
          regularTasks.push(task);
        }
      });

      // Regular tasks
      regularTasks.forEach((task) => {
        const isComplete = task.status === 'complete' || task.status === 'cancelled';
        lines.push(`- [${isComplete ? 'x' : ' '}] ${task.title}`);
      });

      // Blockers section (only if blockers exist)
      if (blockers.length > 0) {
        lines.push('');
        lines.push('## Blockers');
        blockers.forEach((blocker) => {
          lines.push(`- ${blocker.title}`);
        });
      }
    }

    const markdown = lines.join('\n');

    // Return as downloadable file
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="checklist.md"`,
      },
    });
  } catch (error) {
    console.error('Export checklist error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export checklist' },
      { status: 500 }
    );
  }
}

