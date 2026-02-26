// app/projects/[id]/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProjectTabs from './components/ProjectTabs';
import ReadTab from './components/ReadTab';
import ChatsTab from './components/ChatsTab';
import DecisionsTab from './components/DecisionsTab';
import TasksTab from './components/TasksTab';
import { redirect } from 'next/navigation';
import ProjectStartChatButton from './components/ProjectStartChatButton';
import ExportChecklistButton from './components/ExportChecklistButton';
import ProjectOverflowMenu from './components/ProjectOverflowMenu';
import { loadProjectView } from '@/lib/ui-data/project.load';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return {
      title: 'Project | INDEX',
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  return {
    title: project ? `${project.name} | INDEX` : 'Project | INDEX',
    description: project ? `View project: ${project.name}` : 'Project details',
  };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = 'read' } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    // Middleware should handle this, but just in case
    return null;
  }

  // Redirect old tabs to appropriate destinations
  if (tab === 'overview') {
    redirect(`/projects/${id}?tab=read`);
  }
  if (tab === 'highlights') {
    redirect(`/projects/${id}?tab=chats`);
  }
  if (tab === 'library') {
    redirect(`/projects/${id}?tab=read`);
  }

  const supabase = await getSupabaseServerClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, created_at, is_personal')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Get project conversations
  const { data: projectConversations } = await supabase
    .from('project_conversations')
    .select('conversation_id')
    .eq('project_id', id);

  const conversationIds = projectConversations?.map((pc) => pc.conversation_id) || [];

  // Fetch data based on active tab
  let chatsData: any[] = [];
  let decisionsData: any[] = [];
  let tasksData: any[] = [];

  if (conversationIds.length > 0) {
    if (tab === 'chats') {
      // Get conversations (include inactive for filtering)
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, title, created_at, is_inactive')
        .in('id', conversationIds)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (conversations && conversations.length > 0) {
        const convIds = conversations.map((c) => c.id);
        
        // Count highlights per conversation
        const { data: highlightCounts } = await supabase
          .from('highlights')
          .select('conversation_id')
          .in('conversation_id', convIds);

        const highlightCountMap = new Map<string, number>();
        highlightCounts?.forEach((hc) => {
          const count = highlightCountMap.get(hc.conversation_id) || 0;
          highlightCountMap.set(hc.conversation_id, count + 1);
        });

        chatsData = conversations.map((conv) => ({
          id: conv.id,
          title: conv.title,
          status: null,
          updated_at: conv.created_at,
          highlights_count: highlightCountMap.get(conv.id) || 0,
        }));
      }
    }

    if (tab === 'decisions') {
      // Query decisions for this project (by project_id OR by conversation_id)
      // Order: pinned first, then by created_at (descending)
      let decisionsQuery = supabase
        .from('decisions')
        .select('id, title, content, conversation_id, created_at, is_inactive, is_pinned')
        .eq('user_id', user.id);

      // Build OR condition: project_id = id OR conversation_id in conversationIds
      if (conversationIds.length > 0) {
        decisionsQuery = decisionsQuery.or(`project_id.eq.${id},conversation_id.in.(${conversationIds.join(',')})`);
      } else {
        // If no conversations, only show decisions with project_id
        decisionsQuery = decisionsQuery.eq('project_id', id);
      }

      const { data: decisions } = await decisionsQuery
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (decisions && decisions.length > 0) {
        const convIds = [...new Set(decisions.map((d) => d.conversation_id).filter(Boolean))];
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, title')
          .in('id', convIds);

        const conversationMap = new Map(conversations?.map((c) => [c.id, c.title]) || []);

        decisionsData = decisions.map((decision) => ({
          id: decision.id,
          title: decision.title,
          content: decision.content,
          is_pinned: decision.is_pinned || false,
          conversation_title: decision.conversation_id
            ? conversationMap.get(decision.conversation_id) || null
            : null,
          conversation_id: decision.conversation_id,
          created_at: decision.created_at,
        }));
      }
    }

    if (tab === 'tasks') {
      // Query tasks for this project (include inactive for filtering)
      // Order: pinned first, then by sort_order (ascending), then by created_at (descending)
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, status, horizon, conversation_id, created_at, is_inactive, is_pinned, sort_order, source_query')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (tasks && tasks.length > 0) {
        const convIds = [...new Set(tasks.map((t) => t.conversation_id).filter(Boolean))];
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, title')
          .in('id', convIds);

        const conversationMap = new Map(conversations?.map((c) => [c.id, c.title]) || []);

        tasksData = tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          horizon: task.horizon,
          is_pinned: task.is_pinned || false,
          sort_order: task.sort_order,
          conversation_title: task.conversation_id
            ? conversationMap.get(task.conversation_id) || null
            : null,
          conversation_id: task.conversation_id,
          created_at: task.created_at,
          source_query: task.source_query || null,
        }));
      }
    }
  }

  // Load structural state data
  const structuralData = await loadProjectView({
    supabaseClient: supabase,
    user_id: user.id,
    project_id: id,
  });

  const activeTab = (['read', 'decisions', 'tasks', 'chats'].includes(tab)
    ? tab
    : 'read') as 'read' | 'decisions' | 'tasks' | 'chats';

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/projects"
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          
          {/* Actions Row */}
          <div className="mt-4 flex items-center justify-end gap-4">
            {/* Actions - desktop: inline, mobile: overflow menu only */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop: Show all actions inline */}
              <div className="hidden sm:flex items-center gap-3">
                <ProjectStartChatButton projectId={id} projectName={project.name} />
                <ExportChecklistButton projectId={id} />
                <ProjectOverflowMenu projectId={id} projectName={project.name} />
              </div>
              
              {/* Mobile: Show overflow menu only */}
              <div className="sm:hidden">
                <ProjectOverflowMenu projectId={id} projectName={project.name} />
              </div>
            </div>
          </div>
          
          {/* Mobile: Action buttons stack below as full-width */}
          <div className="mt-4 sm:hidden flex flex-col gap-2">
            <ProjectStartChatButton projectId={id} projectName={project.name} />
            <ExportChecklistButton projectId={id} />
          </div>
          
          {/* Project Title */}
          <div className="mt-4">
            <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))]">
              {project.name}
            </h1>
          </div>
          
          {/* Project Orientation / Description */}
          {project.description && (
            <p className="mt-4 text-[rgb(var(--muted))]">
              {project.description}
            </p>
          )}
        </div>

        {/* Structural Timeline Section (Read-only) */}
        {(structuralData.timelineEvents.length > 0 || structuralData.arcs.length > 0) && (
          <div className="mb-8 p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
            <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-4">Timeline</h3>
            
            {/* Timeline Events */}
            {structuralData.timelineEvents.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-[rgb(var(--muted))] mb-2">Decisions & Results</div>
                <div className="space-y-1">
                  {structuralData.timelineEvents.map((event, idx) => (
                    <div key={idx} className="text-xs text-[rgb(var(--muted))]">
                      <span className="font-medium">{event.kind}</span>
                      <span className="ml-2">
                        {new Date(event.occurred_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Arcs */}
            {structuralData.arcs.length > 0 && (
              <div>
                <div className="text-xs text-[rgb(var(--muted))] mb-2">
                  Arcs ({structuralData.arcs.length})
                </div>
                <div className="space-y-2">
                  {structuralData.arcs.map((arc) => (
                    <div key={arc.id} className="text-xs">
                      <div className="text-[rgb(var(--muted))]">
                        <span className="font-mono">{arc.id.substring(0, 8)}...</span>
                        <span className="ml-2">{arc.status}</span>
                        <span className="ml-2">
                          {new Date(arc.last_signal_at).toLocaleDateString()}
                        </span>
                      </div>
                      {/* Phases for this arc */}
                      {structuralData.phasesByArc[arc.id] && structuralData.phasesByArc[arc.id].length > 0 && (
                        <div className="ml-4 mt-1 space-y-1">
                          {structuralData.phasesByArc[arc.id].map((phase) => (
                            <div key={phase.id} className="text-[rgb(var(--muted))]">
                              <span className="font-mono">{phase.id.substring(0, 8)}...</span>
                              <span className="ml-2">{phase.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <ProjectTabs projectId={id} activeTab={activeTab} />
          
          <div className="mt-4">
            {activeTab === 'read' && (
              <ReadTab projectId={id} projectName={project.name} projectDescription={project.description} />
            )}
            {activeTab === 'chats' && (
              <ChatsTab conversations={chatsData} projectId={id} />
            )}
            {activeTab === 'decisions' && <DecisionsTab decisions={decisionsData} projectId={id} />}
            {activeTab === 'tasks' && <TasksTab tasks={tasksData} projectId={id} />}
          </div>
        </div>
      </div>
    </main>
  );
}

