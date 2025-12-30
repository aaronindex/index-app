// app/import/components/QuickImportModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModalShell from '@/app/components/ui/ModalShell';
import Button from '@/app/components/ui/Button';
import { parseTranscript } from '@/lib/parsers/transcript';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

interface QuickImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickImportModal({ isOpen, onClose }: QuickImportModalProps) {
  const router = useRouter();
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectAction, setProjectAction] = useState<'none' | 'existing' | 'new'>('none');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [swapRoles, setSwapRoles] = useState(false);
  const [treatAsSingleBlock, setTreatAsSingleBlock] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<{ userCount: number; assistantCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ conversationId: string; title: string; messageCount: number } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);

  // Fetch projects on mount
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  // Parse transcript on change
  useEffect(() => {
    if (transcript.trim()) {
      const parsed = parseTranscript(transcript, { swapRoles, treatAsSingleBlock });
      setParsedInfo({
        userCount: parsed.userCount,
        assistantCount: parsed.assistantCount,
      });
    } else {
      setParsedInfo(null);
    }
  }, [transcript, swapRoles, treatAsSingleBlock]);

  // Poll job status if jobId exists
  useEffect(() => {
    if (!jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/imports/jobs`);
        if (response.ok) {
          const data = await response.json();
          const currentJob = data.jobs?.find((j: any) => j.id === jobId);
          if (currentJob) {
            setJobStatus(currentJob);
            if (currentJob.status === 'complete') {
              clearInterval(pollInterval);
              // Fetch conversation ID from import
              const supabase = getSupabaseBrowserClient();
              const { data: importData } = await supabase
                .from('imports')
                .select('id')
                .eq('id', currentJob.import_id || '')
                .single();

              if (importData) {
                const { data: convData } = await supabase
                  .from('conversations')
                  .select('id, title')
                  .eq('import_id', importData.id)
                  .single();

                if (convData) {
                  setSuccess({
                    conversationId: convData.id,
                    title: convData.title || 'Untitled',
                    messageCount: currentJob.counts?.messages || 0,
                  });
                  setLoading(false);
                }
              }
            } else if (currentJob.status === 'error') {
              clearInterval(pollInterval);
              setError(currentJob.error || 'Import failed');
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [jobId]);

  const handleImport = async () => {
    if (!transcript.trim()) {
      setError('Please paste a transcript');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/quick-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          title: title.trim() || undefined,
          projectId: projectAction === 'existing' ? projectId : undefined,
          newProject:
            projectAction === 'new' && newProjectName.trim()
              ? {
                  name: newProjectName.trim(),
                  description: newProjectDescription.trim() || undefined,
                }
              : undefined,
          swapRoles,
          treatAsSingleBlock,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.error === 'duplicate') {
          setError(
            `This conversation already exists. ${data.existingConversationId ? 'Would you like to open it?' : ''}`
          );
          // Could add a link to open existing conversation here
          setLoading(false);
          return;
        }
        setError(data.error || 'Failed to import conversation');
        setLoading(false);
        return;
      }

      if (data.processed) {
        // Synchronous processing complete
        setSuccess({
          conversationId: data.conversationId,
          title: data.title,
          messageCount: data.messageCount,
        });
        setLoading(false);
      } else {
        // Queued for background processing
        setJobId(data.jobId);
        setJobStatus({ status: 'queued', step: 'queued' });
        // Continue polling (handled by useEffect)
      }
    } catch (err) {
      setError('Failed to import conversation. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTranscript('');
      setTitle('');
      setProjectId('');
      setProjectAction('none');
      setNewProjectName('');
      setNewProjectDescription('');
      setSwapRoles(false);
      setTreatAsSingleBlock(false);
      setParsedInfo(null);
      setError(null);
      setSuccess(null);
      setJobId(null);
      setJobStatus(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell title="Quick Import" onClose={handleClose}>
      {success ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-400 font-medium">Conversation imported successfully!</p>
            <p className="text-sm text-green-700 dark:text-green-500 mt-1">
              {success.messageCount} messages imported
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                router.push(`/conversations/${success.conversationId}`);
                handleClose();
              }}
            >
              Open Conversation
            </Button>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {jobStatus && jobStatus.status !== 'complete' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-800 dark:text-blue-400 text-sm font-medium">
                Import queued — processing in background
              </p>
              {jobStatus.step && (
                <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                  Step: {jobStatus.step} ({jobStatus.percent || 0}%)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
              Paste Chat Transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="User: Hello&#10;Assistant: Hi there&#10;User: How are you?"
              className="w-full h-64 p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
              disabled={loading}
            />
            {parsedInfo && (
              <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                Detected: {parsedInfo.userCount} User / {parsedInfo.assistantCount} Assistant
              </p>
            )}
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--muted))] cursor-pointer">
                <input
                  type="checkbox"
                  checked={swapRoles}
                  onChange={(e) => setSwapRoles(e.target.checked)}
                  className="w-3 h-3"
                  disabled={loading}
                />
                Swap roles
              </label>
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--muted))] cursor-pointer">
                <input
                  type="checkbox"
                  checked={treatAsSingleBlock}
                  onChange={(e) => setTreatAsSingleBlock(e.target.checked)}
                  className="w-3 h-3"
                  disabled={loading}
                />
                Treat as single block
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
              Title (optional, auto-generated if empty)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-generated from first message"
              className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
              Assign to Project (optional)
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="projectAction"
                  value="none"
                  checked={projectAction === 'none'}
                  onChange={() => setProjectAction('none')}
                  className="w-4 h-4"
                  disabled={loading}
                />
                <span className="text-sm text-[rgb(var(--text))]">Unassigned</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="projectAction"
                  value="existing"
                  checked={projectAction === 'existing'}
                  onChange={() => setProjectAction('existing')}
                  className="w-4 h-4"
                  disabled={loading}
                />
                <span className="text-sm text-[rgb(var(--text))]">Existing Project</span>
              </label>
              {projectAction === 'existing' && (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                  disabled={loading}
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
                  name="projectAction"
                  value="new"
                  checked={projectAction === 'new'}
                  onChange={() => setProjectAction('new')}
                  className="w-4 h-4"
                  disabled={loading}
                />
                <span className="text-sm text-[rgb(var(--text))]">Create New Project</span>
              </label>
              {projectAction === 'new' && (
                <div className="space-y-2 ml-6">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                    disabled={loading}
                  />
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                    rows={2}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={loading || !transcript.trim()}>
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

