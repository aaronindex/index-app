// app/projects/[id]/components/OverviewTab.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';

interface OverviewTabProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
}

interface StillOpenItem {
  type: 'decision' | 'task';
  id: string;
  title: string;
  isBlocker: boolean;
  isOpenLoop: boolean;
  conversationId: string | null;
  conversationTitle: string | null;
  isAIGenerated: boolean;
}

export default function OverviewTab({ projectId, projectName, projectDescription }: OverviewTabProps) {
  const router = useRouter();
  const [hasConversations, setHasConversations] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stillOpenItems, setStillOpenItems] = useState<StillOpenItem[]>([]);
  const [stillOpenLoading, setStillOpenLoading] = useState(true);
  const [orientation, setOrientation] = useState(projectDescription || '');
  const [isEditingOrientation, setIsEditingOrientation] = useState(false);
  const [savingOrientation, setSavingOrientation] = useState(false);
  const orientationInputRef = useRef<HTMLTextAreaElement>(null);

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
      } finally {
        setLoading(false);
      }
    }
    checkConversations();
  }, [projectId]);

  // Fetch still open items
  useEffect(() => {
    async function fetchStillOpen() {
      try {
        const response = await fetch(`/api/projects/${projectId}/still-open`);
        if (response.ok) {
          const data = await response.json();
          setStillOpenItems(data.items || []);
        }
      } catch (error) {
        console.error('Error fetching still open items:', error);
      } finally {
        setStillOpenLoading(false);
      }
    }
    fetchStillOpen();
  }, [projectId]);

  // Handle orientation editing
  const handleOrientationClick = () => {
    setIsEditingOrientation(true);
    setTimeout(() => {
      orientationInputRef.current?.focus();
      if (orientationInputRef.current) {
        orientationInputRef.current.setSelectionRange(
          orientationInputRef.current.value.length,
          orientationInputRef.current.value.length
        );
      }
    }, 0);
  };

  const handleOrientationBlur = async () => {
    if (savingOrientation) return;
    
    setIsEditingOrientation(false);
    const newOrientation = orientation.trim();
    
    // Only save if changed
    if (newOrientation !== (projectDescription || '')) {
      setSavingOrientation(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/orientation`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orientation: newOrientation }),
        });
        
        if (!response.ok) {
          // Revert on error
          setOrientation(projectDescription || '');
        }
      } catch (error) {
        console.error('Error saving orientation:', error);
        setOrientation(projectDescription || '');
      } finally {
        setSavingOrientation(false);
      }
    }
  };

  const handleOrientationKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      orientationInputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setOrientation(projectDescription || '');
      setIsEditingOrientation(false);
    }
  };

  // Show empty state if no conversations
  if (!loading && hasConversations === false) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-12 text-center">
          <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
            Import your first chat to get started
          </h3>
          <p className="text-sm text-[rgb(var(--muted))] mb-6">
            Once you import a conversation, INDEX will extract insights, tasks, and decisions.
          </p>
          <Button 
            variant="primary"
            onClick={() => router.push(`/import?project=${projectId}`)}
          >
            Import chat
          </Button>
        </Card>
      </div>
    );
  }

  // Determine empty state type
  const hasNoSurfacedItems = !stillOpenLoading && stillOpenItems.length === 0;
  const hasActivity = hasConversations === true;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Project Orientation */}
      <div>
        {isEditingOrientation ? (
          <textarea
            ref={orientationInputRef}
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            onBlur={handleOrientationBlur}
            onKeyDown={handleOrientationKeyDown}
            className="w-full text-lg font-serif text-[rgb(var(--text))] bg-transparent border-none outline-none resize-none focus:ring-0 p-0"
            rows={1}
            style={{ minHeight: '1.5rem' }}
            placeholder="What is this project about right now?"
          />
        ) : (
          <div
            onClick={handleOrientationClick}
            className="text-lg font-serif text-[rgb(var(--text))] cursor-text hover:opacity-70 transition-opacity min-h-[1.5rem]"
          >
            {orientation || (
              <span className="text-[rgb(var(--muted))] italic">
                What is this project about right now?
              </span>
            )}
          </div>
        )}
      </div>

      {/* Still Open Section */}
      <div>
        <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4">
          Still Open
        </h2>

        {stillOpenLoading ? (
          <div className="text-sm text-[rgb(var(--muted))]">Loading...</div>
        ) : stillOpenItems.length > 0 ? (
          <div className="space-y-3">
            {stillOpenItems.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={`/projects/${projectId}/${item.type === 'decision' ? 'decisions' : 'tasks'}#${item.id}`}
                className="block"
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-[rgb(var(--muted))] uppercase tracking-wider">
                          {item.type === 'decision' ? 'Decision' : 'Task'}
                        </span>
                        {item.isBlocker && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                            Blocker
                          </span>
                        )}
                        {item.isOpenLoop && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                            Open Loop
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-[rgb(var(--text))] mb-1">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
                        {item.conversationTitle && (
                          <span>From: {item.conversationTitle}</span>
                        )}
                        {item.isAIGenerated && (
                          <span>{item.conversationTitle ? '•' : ''} Generated by INDEX</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : hasNoSurfacedItems ? (
          <Card className="p-12 text-center">
            {!hasActivity ? (
              <>
                <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
                  Nothing surfaced yet.
                </h3>
                <p className="text-sm text-[rgb(var(--muted))] mb-2">
                  As you work, INDEX will surface the decisions and open loops that matter most.
                  This overview becomes useful after reduction — not before.
                </p>
                <p className="text-xs text-[rgb(var(--muted))] italic mt-4">
                  Start with a conversation or extract insights.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-3">
                  Nothing needs attention right now.
                </h3>
                <p className="text-sm text-[rgb(var(--muted))]">
                  This project has no unresolved decisions or open loops.
                  If something changes, it will appear here.
                </p>
              </>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
