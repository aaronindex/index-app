// app/conversations/[id]/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ConversationViewClient from './components/ConversationViewClient';
import DeleteConversationButton from './components/DeleteConversationButton';
import ExtractInsightsButton from './components/ExtractInsightsButton';
import CreateTaskFromHighlightButton from './components/CreateTaskFromHighlightButton';
import DeleteHighlightButton from '@/app/projects/[id]/components/DeleteHighlightButton';

type Status = 'priority' | 'open' | 'complete' | 'dormant';

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

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await getSupabaseServerClient();

  // Get conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, title, source, started_at, ended_at, created_at, parent_conversation_id, origin_highlight_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !conversation) {
    notFound();
  }

  // Get messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, index_in_conversation, created_at')
    .eq('conversation_id', id)
    .order('index_in_conversation', { ascending: true });


  // Get project this conversation belongs to (check current conversation first)
  const { data: projectLink } = await supabase
    .from('project_conversations')
    .select('project_id')
    .eq('conversation_id', id)
    .single();

  // Get project details if linked
  let project: { id: string; name: string } | null = null;
  if (projectLink?.project_id) {
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectLink.project_id)
      .single();
    project = projectData;
  }



  // Get highlights for this conversation
  const { data: highlights } = await supabase
    .from('highlights')
    .select('id, message_id, content, start_offset, end_offset, label')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Tags are generated but not displayed in UI (internal signal layer only)


  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {project ? (
              <Link
                href={`/projects/${project.id}`}
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                ← Back to {project.name}
              </Link>
            ) : (
              <Link
                href="/unassigned"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                ← Back to Unassigned
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-foreground mb-2">
                      {conversation.title || 'Untitled Conversation'}
                    </h1>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusPill status={null} />
                <ExtractInsightsButton conversationId={id} projectId={project?.id || null} />
                <DeleteConversationButton
                  conversationId={id}
                  conversationTitle={conversation.title}
                  projectId={project?.id || null}
                />
              </div>
            </div>

            {/* Messages */}
            <ConversationViewClient
              conversation={conversation}
              messages={messages || []}
              highlights={highlights || []}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Highlights Section */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-white dark:bg-zinc-950">
              <h2 className="font-medium text-foreground mb-4">Highlights</h2>
              {highlights && highlights.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded text-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          {highlight.label && (
                            <p className="font-medium text-foreground mb-1">{highlight.label}</p>
                          )}
                          <p className="text-zinc-700 dark:text-zinc-300 text-xs">
                            {highlight.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {project && (
                          <CreateTaskFromHighlightButton
                            highlightId={highlight.id}
                            highlightContent={highlight.content}
                            conversationId={id}
                            projectId={project.id}
                          />
                        )}
                        <DeleteHighlightButton highlightId={highlight.id} highlightLabel={highlight.label} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  No highlights yet. Select text to create highlights.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

