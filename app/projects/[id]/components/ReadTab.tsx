// app/projects/[id]/components/ReadTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ReadTabProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
}

interface StillUnfoldingItem {
  type: 'decision' | 'task';
  id: string;
  title: string;
  isBlocker: boolean;
  isOpenLoop: boolean;
  conversationId: string | null;
  conversationTitle: string | null;
}

interface RecentDecision {
  id: string;
  title: string;
  created_at: string;
}

interface NextTask {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface RecentChat {
  id: string;
  title: string | null;
  created_at: string;
}

export default function ReadTab({ projectId, projectName, projectDescription }: ReadTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stillUnfolding, setStillUnfolding] = useState<StillUnfoldingItem[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([]);
  const [nextTasks, setNextTasks] = useState<NextTask[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [currentDirection, setCurrentDirection] = useState<string | null>(null);
  const [hasConversations, setHasConversations] = useState<boolean | null>(null);

  // Check if project has conversations
  useEffect(() => {
    async function checkConversations() {
      try {
        const response = await fetch(`/api/projects/${projectId}/has-conversations`);
        if (response.ok) {
          const data = await response.json();
          setHasConversations(data.hasConversations);
        } else {
          setHasConversations(true);
        }
      } catch (error) {
        console.error('Error checking conversations:', error);
        setHasConversations(true);
      }
    }
    checkConversations();
  }, [projectId]);

  // Fetch all Read data
  useEffect(() => {
    async function fetchReadData() {
      try {
        // Fetch still unfolding (active tensions)
        const stillOpenResponse = await fetch(`/api/projects/${projectId}/still-open`);
        if (stillOpenResponse.ok) {
          const stillOpenData = await stillOpenResponse.json();
          setStillUnfolding(stillOpenData.items || []);
        }

        // Fetch recent decisions (limit 5)
        const decisionsResponse = await fetch(`/api/projects/${projectId}/read-data?type=decisions&limit=5`);
        let hasDecisions = false;
        if (decisionsResponse.ok) {
          const decisionsData = await decisionsResponse.json();
          setRecentDecisions(decisionsData.items || []);
          
          // Derive current direction from most recent decision
          if (decisionsData.items && decisionsData.items.length > 0) {
            const mostRecent = decisionsData.items[0];
            setCurrentDirection(mostRecent.title);
            hasDecisions = true;
          }
        }

        // Fetch next tasks (limit 5)
        const tasksResponse = await fetch(`/api/projects/${projectId}/read-data?type=tasks&limit=5`);
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setNextTasks(tasksData.items || []);
          
          // If no decisions, derive current direction from tasks
          if (!hasDecisions && tasksData.items && tasksData.items.length > 0) {
            setCurrentDirection('advancing active work');
          }
        }

        // Fetch recent chats (limit 5)
        const chatsResponse = await fetch(`/api/projects/${projectId}/read-data?type=chats&limit=5`);
        if (chatsResponse.ok) {
          const chatsData = await chatsResponse.json();
          setRecentChats(chatsData.items || []);
        }
      } catch (error) {
        console.error('Error fetching read data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchReadData();
  }, [projectId]);

  // Show empty state if no conversations
  if (!loading && hasConversations === false) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-12 text-center border border-[rgb(var(--ring)/0.08)] rounded-lg">
          <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
            Import your first chat to get started
          </h3>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Once you import a conversation, INDEX will extract insights, tasks, and decisions.
          </p>
          <button
            onClick={() => router.push(`/import?project=${projectId}`)}
            className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity"
          >
            Import chat
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Current Direction */}
      {currentDirection && (
        <div className="mb-10">
          <div className="text-xs uppercase tracking-wider text-[rgb(var(--text))] mb-3 font-medium">
            CURRENT DIRECTION
          </div>
          <div className="font-serif text-xl text-[rgb(var(--text))] leading-relaxed">
            {currentDirection}
          </div>
        </div>
      )}

      {/* Still Unfolding (Active Tensions) */}
      {stillUnfolding.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
            Still Unfolding
          </h2>
          <ul className="space-y-2">
            {stillUnfolding.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href={`/projects/${projectId}/${item.type === 'decision' ? 'decisions' : 'tasks'}?tab=${item.type === 'decision' ? 'decisions' : 'tasks'}#${item.id}`}
                  className="block text-sm text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[rgb(var(--muted))] uppercase">
                      {item.type === 'decision' ? 'Decision' : 'Task'}
                    </span>
                    {item.isBlocker && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                        Blocker
                      </span>
                    )}
                    {item.isOpenLoop && (
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                        Open loop
                      </span>
                    )}
                    <span className="flex-1">{item.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Shifts (Decisions) */}
      {recentDecisions.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
            Recent Shifts
          </h2>
          <ul className="space-y-2">
            {recentDecisions.map((decision) => (
              <li key={decision.id}>
                <Link
                  href={`/projects/${projectId}/decisions?tab=decisions#${decision.id}`}
                  className="block text-sm text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] transition-colors"
                >
                  <span className="text-[rgb(var(--muted))]">You decided to: </span>
                  <span>{decision.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Motion (Tasks) */}
      {nextTasks.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
            Next Motion
          </h2>
          <ul className="space-y-2">
            {nextTasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/projects/${projectId}/tasks?tab=tasks#${task.id}`}
                  className="block text-sm text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] transition-colors"
                >
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent Thinking Added (Chats) */}
      {recentChats.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--text))] mb-3">
            Recent Thinking Added
          </h2>
          <ul className="space-y-2">
            {recentChats.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/conversations/${chat.id}`}
                  className="block text-sm text-[rgb(var(--text))] hover:text-[rgb(var(--muted))] transition-colors"
                >
                  <span className="text-[rgb(var(--muted))] text-xs">
                    {new Date(chat.created_at).toLocaleDateString()} •{' '}
                  </span>
                  {chat.title || 'Untitled Conversation'}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state if no data */}
      {stillUnfolding.length === 0 && recentDecisions.length === 0 && nextTasks.length === 0 && recentChats.length === 0 && hasConversations === true && (
        <div className="p-12 text-center border border-[rgb(var(--ring)/0.08)] rounded-lg">
          <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
            Nothing surfaced yet.
          </h3>
          <p className="text-sm text-[rgb(var(--muted))] mb-2">
            As you work, INDEX will surface the decisions and open loops that matter most.
          </p>
          <p className="text-xs text-[rgb(var(--muted))] italic mt-4">
            Start with a conversation or extract insights.
          </p>
        </div>
      )}
    </div>
  );
}
