// app/projects/[id]/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import ProjectTabs from './components/ProjectTabs';
import OnboardingProjectOverlay from './components/OnboardingProjectOverlay';
import ReadTab from './components/ReadTab';
import ChatsTab from './components/ChatsTab';
import SignalsTab from './components/SignalsTab';
import ProjectStartChatButton from './components/ProjectStartChatButton';
import ProjectOverflowMenu from './components/ProjectOverflowMenu';
import { loadProjectView } from '@/lib/ui-data';
import { getProjectReadTabServerData } from '@/lib/ui-data/project-read-tab-data';

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
  const { tab: tabParam = 'read' } = await searchParams;
  const tab = tabParam === 'sources' ? 'chats' : tabParam;
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  // Redirect old tabs to consolidated nav: Read / Signals / Sources
  if (tab === 'overview' || tab === 'library') {
    redirect(`/projects/${id}?tab=read`);
  }
  if (tab === 'highlights') {
    redirect(`/projects/${id}?tab=chats`);
  }
  if (tab === 'decisions' || tab === 'tasks') {
    redirect(`/projects/${id}?tab=signals`);
  }

  const supabase = await getSupabaseServerClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, created_at, is_personal, last_reduce_at')
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
  const sourceCount = conversationIds.length;

  // Captures since last reduce: count conversations (source=capture) in this project created after last_reduce_at.
  // If last_reduce_at is null, show 0 (calm: nothing until first reduce).
  let capturesSinceLastReduce = 0;
  const lastReduceAt = (project as { last_reduce_at?: string | null }).last_reduce_at ?? null;
  if (lastReduceAt && conversationIds.length > 0) {
    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .in('id', conversationIds)
      .eq('user_id', user.id)
      .eq('source', 'capture')
      .gt('created_at', lastReduceAt);
    capturesSinceLastReduce = count ?? 0;
  }

  if (process.env.NODE_ENV === 'development' && capturesSinceLastReduce > 0) {
    console.log('[AccumulationIndicator]', { project_id: id, count: capturesSinceLastReduce });
  }

  // Fetch data based on active tab (signals = decisions + tasks + highlights in one surface)
  let chatsData: any[] = [];
  let decisionsData: any[] = [];
  let tasksData: any[] = [];
  let highlightsData: any[] = [];

  if (conversationIds.length > 0) {
    const needsSignalsData = tab === 'signals';
    const needsChatsData = tab === 'chats';

    if (needsChatsData) {
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

    if (needsSignalsData) {
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
          is_inactive: decision.is_inactive ?? false,
          conversation_title: decision.conversation_id
            ? conversationMap.get(decision.conversation_id) || null
            : null,
          conversation_id: decision.conversation_id,
          created_at: decision.created_at,
        }));
      }
    }

    if (needsSignalsData) {
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
          is_inactive: task.is_inactive ?? false,
        }));
      }
    }

    if (needsSignalsData && conversationIds.length > 0) {
      const { data: highlights } = await supabase
        .from('highlights')
        .select('id, content, label, conversation_id, created_at')
        .in('conversation_id', conversationIds)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (highlights && highlights.length > 0) {
        const convIds = [...new Set(highlights.map((h) => h.conversation_id))];
        const { data: convTitles } = await supabase
          .from('conversations')
          .select('id, title')
          .in('id', convIds);
        const convMap = new Map(convTitles?.map((c) => [c.id, c.title]) || []);
        highlightsData = highlights.map((h) => ({
          id: h.id,
          content: h.content,
          label: h.label,
          status: null as string | null,
          conversation_title: convMap.get(h.conversation_id) || null,
          conversation_id: h.conversation_id,
          created_at: h.created_at,
        }));
      }
    }
  }

  const activeTab = (['read', 'signals', 'chats'].includes(tab)
    ? tab
    : 'read') as 'read' | 'signals' | 'chats';
  const captureLabel = capturesSinceLastReduce === 1 ? 'capture' : 'captures';

  // Structural data for Read tab (snapshot + arcs + timeline, read-only)
  const projectViewData =
    activeTab === 'read'
      ? await loadProjectView({
          supabaseClient: supabase,
          user_id: user.id,
          project_id: id,
        })
      : null;

  // Read tab server data (still unfolding, decisions, tasks) to avoid client fetch flicker
  const readTabServerData =
    activeTab === 'read'
      ? await getProjectReadTabServerData(supabase, user.id, id, conversationIds)
      : null;

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <OnboardingProjectOverlay />
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

          {/* Accumulation: new captures since last distillation (calm; only when last distill exists and count > 0) */}
          {lastReduceAt != null && capturesSinceLastReduce > 0 && (
            <p className="mt-3 text-sm text-[rgb(var(--muted))]">
              {capturesSinceLastReduce} new {captureLabel} since last distillation{' '}
              <Link
                href={`/projects/${id}?tab=chats`}
                className="text-[rgb(var(--text))] hover:underline"
              >
                Distill signals
              </Link>
            </p>
          )}
        </div>

        <div className="mt-8">
          <ProjectTabs projectId={id} activeTab={activeTab} />
          
          <div className="mt-4">
            {activeTab === 'read' && (
              <ReadTab
                projectId={id}
                projectName={project.name}
                projectDescription={project.description}
                snapshotText={projectViewData?.snapshotText ?? null}
                snapshotGeneratedAt={projectViewData?.snapshotGeneratedAt ?? null}
                activeArcs={projectViewData?.activeArcs ?? []}
                projectSnapshots={projectViewData?.projectSnapshots ?? []}
                projectTimelineEvents={projectViewData?.projectTimelineEvents ?? []}
                latestSnapshotOutcomeText={projectViewData?.latestSnapshotOutcomeText ?? null}
                sourceCount={sourceCount}
                serverReadData={readTabServerData}
              />
            )}
            {activeTab === 'signals' && (
              <SignalsTab
                decisions={decisionsData}
                tasks={tasksData}
                highlights={highlightsData}
                projectId={id}
                projectName={project.name}
              />
            )}
            {activeTab === 'chats' && (
              <ChatsTab conversations={chatsData} projectId={id} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

