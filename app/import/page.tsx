// app/import/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { parseTranscript } from '@/lib/parsers/transcript';
import Card from '@/app/components/ui/Card';
import { trackEvent } from '@/lib/analytics';

export default function ImportPage() {
  const router = useRouter();

  // Quick Import state
  const [quickTranscript, setQuickTranscript] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickProjectId, setQuickProjectId] = useState<string>('');
  const [quickProjectAction, setQuickProjectAction] = useState<'none' | 'existing' | 'new'>('none');
  const [quickNewProjectName, setQuickNewProjectName] = useState('');
  const [quickNewProjectDescription, setQuickNewProjectDescription] = useState('');
  const [quickParsedInfo, setQuickParsedInfo] = useState<{ userCount: number; assistantCount: number } | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSuccess, setQuickSuccess] = useState<{ conversationId: string; title: string; messageCount: number } | null>(null);
  const [quickThinkingTimeChoice, setQuickThinkingTimeChoice] = useState<'today' | 'yesterday' | 'last_week' | 'last_month'>('today');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Update page title
  useEffect(() => {
    document.title = 'Import | INDEX';
  }, []);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userProjects } = await supabase
          .from('projects')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setProjects(userProjects || []);
      }
    };

    fetchProjects();
  }, []);

  // Check for project pre-selection from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectIdFromUrl = params.get('project');
    if (projectIdFromUrl && projects.length > 0) {
      const projectExists = projects.some(p => p.id === projectIdFromUrl);
      if (projectExists) {
        setQuickProjectId(projectIdFromUrl);
        setQuickProjectAction('existing');
      }
    }
  }, [projects]);

  // Parse quick import transcript on change
  useEffect(() => {
    if (quickTranscript.trim()) {
      const parsed = parseTranscript(quickTranscript);
      setQuickParsedInfo({
        userCount: parsed.userCount,
        assistantCount: parsed.assistantCount,
      });
    } else {
      setQuickParsedInfo(null);
    }
  }, [quickTranscript]);

  const handleQuickImport = async () => {
    if (!quickTranscript.trim()) {
      setQuickError('Please paste a transcript');
      return;
    }

    if (quickProjectAction === 'existing' && !quickProjectId) {
      setQuickError('Please select a project');
      return;
    }

    if (quickProjectAction === 'new' && !quickNewProjectName.trim()) {
      setQuickError('Please enter a project name');
      return;
    }

    setQuickLoading(true);
    setQuickError(null);
    const startTime = Date.now();

    trackEvent('import_started', {
      import_type: 'quick_paste',
      chars: quickTranscript.trim().length,
      has_project: quickProjectAction === 'existing' || quickProjectAction === 'new',
    });

    try {
      const response = await fetch('/api/quick-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: quickTranscript.trim(),
          title: quickTitle.trim() || undefined,
          projectId: quickProjectAction === 'existing' ? quickProjectId : undefined,
          newProject:
            quickProjectAction === 'new' && quickNewProjectName.trim()
              ? {
                  name: quickNewProjectName.trim(),
                  description: quickNewProjectDescription.trim() || undefined,
                }
              : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          trackEvent('limit_hit', { limit_type: 'import' });
        }

        if (response.status === 409 && data.error === 'duplicate') {
          setQuickError(`This conversation already exists.`);
          const latencyMs = Date.now() - startTime;
          trackEvent('import_failed', {
            import_type: 'quick_paste',
            latency_ms: latencyMs,
            error: 'duplicate',
          });
          setQuickLoading(false);
          return;
        }

        const latencyMs = Date.now() - startTime;
        trackEvent('import_failed', {
          import_type: 'quick_paste',
          latency_ms: latencyMs,
          error: data.error || 'Failed to import conversation',
        });
        setQuickError(data.error || 'Failed to import conversation');
        setQuickLoading(false);
        return;
      }

      if (data.processed && data.conversationId) {
        try {
          await fetch('/api/thinking-time/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: data.conversationId,
              choice: quickThinkingTimeChoice,
            }),
          });
        } catch (resolveErr) {
          console.warn('[QuickImport] Thinking time resolve failed:', resolveErr);
        }

        const latencyMs = Date.now() - startTime;
        trackEvent('import_completed', {
          import_type: 'quick_paste',
          import_id: data.importId || undefined,
          latency_ms: latencyMs,
          conversation_count: 1,
          message_count: data.messageCount || 0,
        });

        setQuickSuccess({
          conversationId: data.conversationId,
          title: data.title,
          messageCount: data.messageCount,
        });
        setQuickLoading(false);
      }
    } catch (err) {
      const latencyMs = startTime ? Date.now() - startTime : 0;
      trackEvent('import_failed', {
        import_type: 'quick_paste',
        latency_ms: latencyMs,
        error: err instanceof Error ? err.message : 'Failed to import conversation',
      });
      setQuickError('Failed to import conversation. Please try again.');
      console.error(err);
      setQuickLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-8">Import</h1>

        {quickError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-400">{quickError}</p>
          </div>
        )}

        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-[rgb(var(--text))] mb-2">Quick Import</h2>
            <p className="text-[rgb(var(--muted))]">
              Paste a conversation from ChatGPT, Claude, or Cursor. INDEX will help you reduce it to what still matters.
            </p>
          </div>

          {quickSuccess ? (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-800 dark:text-green-400 font-medium">Conversation imported successfully!</p>
                  <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                    {quickSuccess.messageCount} messages imported
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      router.push(`/conversations/${quickSuccess.conversationId}`);
                      setQuickSuccess(null);
                      setQuickTranscript('');
                      setQuickTitle('');
                    }}
                    className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Open Conversation
                  </button>
                  <button
                    onClick={() => {
                      setQuickSuccess(null);
                      setQuickTranscript('');
                      setQuickTitle('');
                    }}
                    className="px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium"
                  >
                    Import Another
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="space-y-6">

                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    Paste Chat Transcript
                  </label>
                  <textarea
                    value={quickTranscript}
                    onChange={(e) => setQuickTranscript(e.target.value)}
                    placeholder="Paste a chat transcript here…"
                    className="w-full h-48 p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                    disabled={quickLoading}
                  />
                  {quickParsedInfo && (
                    <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                      Detected: {quickParsedInfo.userCount} User / {quickParsedInfo.assistantCount} Assistant
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    Title (optional, auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Auto-generated from first message"
                    className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                    disabled={quickLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    When did this thinking happen?
                  </label>
                  <select
                    value={quickThinkingTimeChoice}
                    onChange={(e) => setQuickThinkingTimeChoice(e.target.value as typeof quickThinkingTimeChoice)}
                    className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                    disabled={quickLoading}
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_week">Last week</option>
                    <option value="last_month">Last month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                    Assign to Project (optional)
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="quickProjectAction"
                        value="none"
                        checked={quickProjectAction === 'none'}
                        onChange={() => setQuickProjectAction('none')}
                        className="w-4 h-4"
                        disabled={quickLoading}
                      />
                      <span className="text-sm text-[rgb(var(--text))]">Unassigned</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="quickProjectAction"
                        value="existing"
                        checked={quickProjectAction === 'existing'}
                        onChange={() => setQuickProjectAction('existing')}
                        className="w-4 h-4"
                        disabled={quickLoading}
                      />
                      <span className="text-sm text-[rgb(var(--text))]">Existing Project</span>
                    </label>
                    {quickProjectAction === 'existing' && (
                      <select
                        value={quickProjectId}
                        onChange={(e) => setQuickProjectId(e.target.value)}
                        className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                        disabled={quickLoading}
                      >
                        <option value="">Select a project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="quickProjectAction"
                        value="new"
                        checked={quickProjectAction === 'new'}
                        onChange={() => setQuickProjectAction('new')}
                        className="w-4 h-4"
                        disabled={quickLoading}
                      />
                      <span className="text-sm text-[rgb(var(--text))]">Create New Project</span>
                    </label>
                    {quickProjectAction === 'new' && (
                      <div className="space-y-2 ml-6">
                        <input
                          type="text"
                          value={quickNewProjectName}
                          onChange={(e) => setQuickNewProjectName(e.target.value)}
                          placeholder="Project name"
                          className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                          disabled={quickLoading}
                        />
                        <textarea
                          value={quickNewProjectDescription}
                          onChange={(e) => setQuickNewProjectDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                          rows={2}
                          disabled={quickLoading}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={handleQuickImport}
                    disabled={quickLoading || !quickTranscript.trim()}
                    className="px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {quickLoading ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
