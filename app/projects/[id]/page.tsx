// app/projects/[id]/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProjectTabs from './components/ProjectTabs';
import OverviewTab from './components/OverviewTab';
import ChatsTab from './components/ChatsTab';
import HighlightsTab from './components/HighlightsTab';
import DecisionsTab from './components/DecisionsTab';
import TasksTab from './components/TasksTab';
import LibraryTab from './components/LibraryTab';
import DeleteProjectButton from './components/DeleteProjectButton';
import ProjectStartChatButton from './components/ProjectStartChatButton';
import ExportChecklistButton from './components/ExportChecklistButton';

type Status = 'priority' | 'open' | 'complete' | 'dormant';

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

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  
  const statusColors: Record<Status, string> = {
    priority: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dormant: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500',
  };

  const colorClass = statusColors[status as Status] || statusColors.dormant;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = 'overview' } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    // Middleware should handle this, but just in case
    return null;
  }

  const supabase = await getSupabaseServerClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, status, description, created_at, is_personal')
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
  let highlightsData: any[] = [];
  let decisionsData: any[] = [];
  let tasksData: any[] = [];
  let assetsData: any[] = [];

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

    if (tab === 'highlights') {
      const { data: highlights } = await supabase
        .from('highlights')
        .select('id, content, label, status, conversation_id, created_at')
        .in('conversation_id', conversationIds)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (highlights && highlights.length > 0) {
        const convIds = [...new Set(highlights.map((h) => h.conversation_id))];
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id, title')
          .in('id', convIds);

        const conversationMap = new Map(conversations?.map((c) => [c.id, c.title]) || []);

        highlightsData = highlights.map((highlight) => ({
          id: highlight.id,
          content: highlight.content,
          label: highlight.label,
          status: highlight.status,
          conversation_title: conversationMap.get(highlight.conversation_id) || null,
          conversation_id: highlight.conversation_id,
          created_at: highlight.created_at,
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

    if (tab === 'library') {
      // Query assets for this project (include inactive for filtering)
      const { data: assets } = await supabase
        .from('project_assets')
        .select('id, type, title, url, domain, note, storage_path, mime_type, file_size, thumbnail_url, created_at, is_inactive')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      assetsData = assets || [];
    }
  }

  const activeTab = (['overview', 'decisions', 'tasks', 'chats', 'highlights', 'library'].includes(tab)
    ? tab
    : 'overview') as 'overview' | 'decisions' | 'tasks' | 'chats' | 'highlights' | 'library';

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
          {/* Mobile: Stack buttons, name, description on separate rows */}
          {/* Desktop: Keep horizontal layout */}
          <div className="mt-4">
            {/* Mobile: Stack layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Buttons row - full width on mobile, right side on desktop */}
              <div className="flex items-center gap-3 w-full sm:w-auto sm:order-2">
                <StatusPill status={project.status} />
                <ExportChecklistButton projectId={id} />
                <ProjectStartChatButton projectId={id} projectName={project.name} />
                <DeleteProjectButton projectId={id} projectName={project.name} />
              </div>
              
              {/* Project name row - full width on mobile, left side on desktop */}
              <div className="w-full sm:w-auto sm:order-1">
                <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))]">
                  {project.name}
                </h1>
              </div>
            </div>
            
            {/* Description row - full width on mobile, below on desktop */}
            {project.description && (
              <p className="mt-4 text-[rgb(var(--muted))]">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8">
          <ProjectTabs projectId={id} activeTab={activeTab} />
          
          <div className="mt-4">
            {activeTab === 'overview' && (
              <OverviewTab projectId={id} projectName={project.name} projectDescription={project.description} />
            )}
            {activeTab === 'chats' && (
              <ChatsTab conversations={chatsData} projectId={id} />
            )}
            {activeTab === 'highlights' && (
              <HighlightsTab highlights={highlightsData} projectName={project.name} />
            )}
            {activeTab === 'decisions' && <DecisionsTab decisions={decisionsData} projectId={id} />}
            {activeTab === 'tasks' && <TasksTab tasks={tasksData} projectId={id} />}
            {activeTab === 'library' && <LibraryTab assets={assetsData} projectId={id} />}
          </div>
        </div>
      </div>
    </main>
  );
}

