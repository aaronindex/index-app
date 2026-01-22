// app/import/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { parseChatGPTExport } from '@/lib/parsers/chatgpt';
import { parseTranscript } from '@/lib/parsers/transcript';
import Card from '@/app/components/ui/Card';
import { trackEvent } from '@/lib/analytics';

interface DetectedConversation {
  id: string;
  title: string;
  messageCount: number;
  selected: boolean;
}

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'preview' | 'assign'>('upload');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update page title
  useEffect(() => {
    document.title = 'Import | INDEX';
  }, []);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedConversations, setDetectedConversations] = useState<DetectedConversation[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectAction, setProjectAction] = useState<'none' | 'existing' | 'new'>('none');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

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
  const lastTranscriptLengthRef = useRef<number>(0);

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

  // Helper function to detect if content has recognizable role markers
  const hasRoleMarkers = (text: string): boolean => {
    if (!text.trim()) return false;
    const lines = text.split(/\r?\n/);
    const USER_MARKERS = [
      /^\s*\*\*User:\*\*\s*/i,
      /^\s*\*\*Me:\*\*\s*/i,
      /^\s*\*\*Human:\*\*\s*/i,
      /^\s*User:\s*/i,
      /^\s*Me:\s*/i,
      /^\s*Human:\s*/i,
      /^\s*USER:\s*/,
      /^\s*ME:\s*/,
      /^\s*HUMAN:\s*/,
    ];
    const ASSISTANT_MARKERS = [
      /^\s*\*\*Assistant:\*\*\s*/i,
      /^\s*\*\*AI:\*\*\s*/i,
      /^\s*\*\*ChatGPT:\*\*\s*/i,
      /^\s*\*\*Claude:\*\*\s*/i,
      /^\s*Assistant:\s*/i,
      /^\s*AI:\s*/i,
      /^\s*ChatGPT:\s*/i,
      /^\s*Claude:\s*/i,
      /^\s*ASSISTANT:\s*/,
      /^\s*AI:\s*/,
      /^\s*CHATGPT:\s*/,
      /^\s*CLAUDE:\s*/,
    ];
    for (const line of lines) {
      for (const marker of [...USER_MARKERS, ...ASSISTANT_MARKERS]) {
        if (marker.test(line)) {
          return true;
        }
      }
    }
    return false;
  };

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

  // Guardrail: Auto-enable single block mode if no role markers detected
  // Only auto-enables when new content is pasted (transcript length increases), not on manual checkbox toggles
  useEffect(() => {
    const currentLength = quickTranscript.trim().length;
    const isNewContent = currentLength > lastTranscriptLengthRef.current && currentLength > 50;
    
    if (isNewContent) {
      const hasMarkers = hasRoleMarkers(quickTranscript);
      if (!hasMarkers) {
        // Non-blocking: default to single block for content without recognizable role markers
      }
    }
    
    lastTranscriptLengthRef.current = currentLength;
  }, [quickTranscript]);

  // Quick imports are now always processed synchronously (no polling needed)

  const handleQuickImport = async () => {
    if (!quickTranscript.trim()) {
      setQuickError('Please paste a transcript');
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

      if (data.processed) {
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.json')) {
      setError('Please upload a JSON file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      const parsedConversations = parseChatGPTExport(data);
      
      if (parsedConversations.length === 0) {
        setError(
          'No conversations detected in the file. Please ensure it is a valid ChatGPT export.'
        );
        setLoading(false);
        return;
      }

      setDetectedConversations(
        parsedConversations.map((conv) => ({
          id: conv.id,
          title: conv.title,
          messageCount: conv.messages.length,
          selected: true,
        }))
      );

      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userProjects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (projectsError) {
          console.error('[Import] Error fetching projects:', projectsError);
          setProjects([]);
        } else {
          setProjects(Array.isArray(userProjects) ? userProjects : []);
        }
      }

      setStep('preview');
    } catch (err) {
      setError('Failed to parse file. Please ensure it is a valid ChatGPT export JSON.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConversation = (id: string) => {
    setDetectedConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, selected: !conv.selected } : conv))
    );
  };

  const getUploadFileType = (file: File): 'zip' | 'json' | 'unknown' => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.zip')) {
      return 'zip';
    } else if (fileName.endsWith('.json')) {
      return 'json';
    }
    return 'unknown';
  };

  const handleImport = async () => {
    if (!file) return;

    const selected = detectedConversations.filter((c) => c.selected);
    if (selected.length === 0) {
      setError('Please select at least one conversation to import.');
      return;
    }

    setLoading(true);
    setError(null);

    const importStartTime = Date.now();

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be signed in to import.');
        setLoading(false);
        return;
      }

      const fileText = await file.text();
      const fileData = JSON.parse(fileText);

      const { data: importRecord, error: importError } = await supabase
        .from('imports')
        .insert({
          user_id: user.id,
          source: 'chatgpt_export',
          status: 'pending',
        })
        .select()
        .single();

      if (importError || !importRecord) {
        setError(importError?.message || 'Failed to create import record.');
        setLoading(false);
        return;
      }

      let finalProjectId: string | null = null;
      let newProjectData: { name: string; description: string } | null = null;

      if (projectAction === 'existing' && selectedProjectId) {
        finalProjectId = selectedProjectId;
      } else if (projectAction === 'new' && newProjectName.trim()) {
        newProjectData = {
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || '',
        };
      }

      trackEvent('import_started', {
        import_type: 'file_upload',
        conversation_count: selected.length,
        has_project: !!finalProjectId || !!newProjectData,
        size_bytes: file.size || 0,
        file_type: getUploadFileType(file),
      });

      const response = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: importRecord.id,
          fileData,
          selectedConversationIds: selected.map((c) => c.id),
          projectId: finalProjectId,
          newProject: newProjectData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Import failed.');
        
        if (response.status === 429) {
          trackEvent('limit_hit', { limit_type: 'import' });
        }
        
        const latencyMs = Date.now() - importStartTime;
        trackEvent('import_failed', {
          import_type: 'file_upload',
          import_id: importRecord.id,
          latency_ms: latencyMs,
          error: errorData.error || 'Import failed',
          size_bytes: file.size || 0,
          file_type: getUploadFileType(file),
        });
        setLoading(false);
        return;
      }

      const result = await response.json();
      
      if (result.status === 'complete' && !result.jobId) {
        const latencyMs = Date.now() - importStartTime;
        trackEvent('import_completed', {
          import_type: 'file_upload',
          import_id: importRecord.id,
          latency_ms: latencyMs,
          conversation_count: result.conversationIds?.length || 1,
          message_count: 0,
          size_bytes: file.size || 0,
          file_type: getUploadFileType(file),
        });
        
        setLoading(false);
        
        if (finalProjectId) {
          router.push(`/projects/${finalProjectId}?imported=${result.conversationIds?.length || 1}`);
        } else {
          router.push(`/unassigned?imported=${result.conversationIds?.length || 1}`);
        }
        return;
      }
      
      const jobId = result.jobId;
      if (!jobId) {
        setError('Import response missing job ID. Please try again.');
        setLoading(false);
        return;
      }
      
      const maxPolls = 600;
      let localPollCount = 0;
      const pollInterval = setInterval(async () => {
        localPollCount++;
        setPollCount(localPollCount);
        
        try {
          const jobsResponse = await fetch('/api/imports/jobs');
          if (!jobsResponse.ok) {
            console.error('[Import] Failed to fetch job status:', jobsResponse.status);
            if (localPollCount >= maxPolls) {
              clearInterval(pollInterval);
              setError('Failed to check import status. Please refresh the page.');
              setLoading(false);
            }
            return;
          }
          
          const jobsData = await jobsResponse.json();
          const jobs = Array.isArray(jobsData.jobs) ? jobsData.jobs : [];
          const currentJob = jobs.find((j: any) => j.id === jobId);
          
          if (!currentJob) {
            console.warn('[Import] Job not found in list, poll count:', localPollCount);
            if (localPollCount >= 10) {
              clearInterval(pollInterval);
              setError('Import job not found. Please try importing again.');
              setLoading(false);
            }
            return;
          }
          
          setJobStatus(currentJob);
          
          if (currentJob.status === 'complete') {
            clearInterval(pollInterval);
            setLoading(false);
            
            const latencyMs = Date.now() - importStartTime;
            trackEvent('import_completed', {
              import_type: 'file_upload',
              import_id: importRecord.id,
              job_id: jobId,
              latency_ms: latencyMs,
              conversation_count: currentJob.counts?.conversations || 0,
              message_count: currentJob.counts?.messages || 0,
              size_bytes: file.size || 0,
              file_type: getUploadFileType(file),
            });
            
            if (finalProjectId) {
              router.push(`/projects/${finalProjectId}?imported=${currentJob.counts?.conversations || 0}`);
            } else {
              router.push(`/unassigned?imported=${currentJob.counts?.conversations || 0}`);
            }
          } else if (currentJob.status === 'error') {
            clearInterval(pollInterval);
            const latencyMs = Date.now() - importStartTime;
            trackEvent('import_failed', {
              import_type: 'file_upload',
              import_id: importRecord.id,
              job_id: jobId,
              latency_ms: latencyMs,
              error: currentJob.error || 'Import failed',
              size_bytes: file.size || 0,
              file_type: getUploadFileType(file),
            });
            setError(currentJob.error || 'Import failed');
            setLoading(false);
          }
        } catch (err) {
          console.error('[Import] Error polling job status:', err);
          localPollCount++;
          setPollCount(localPollCount);
          if (localPollCount >= maxPolls) {
            clearInterval(pollInterval);
            setError('Error checking import status. Please refresh the page.');
            setLoading(false);
          }
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(pollInterval);
        setLoading((prevLoading) => {
          if (prevLoading) {
            const latencyMs = Date.now() - importStartTime;
            trackEvent('import_failed', {
              import_type: 'file_upload',
              import_id: importRecord.id,
              job_id: jobId,
              latency_ms: latencyMs,
              error: 'Timeout',
              size_bytes: file.size || 0,
              file_type: getUploadFileType(file),
            });
            setError('Import is taking longer than expected. Please check back later or try refreshing the page.');
            return false;
          }
          return prevLoading;
        });
      }, 10 * 60 * 1000);
    } catch (err) {
      const latencyMs = Date.now() - importStartTime;
      trackEvent('import_failed', {
        import_type: 'file_upload',
        latency_ms: latencyMs,
        error: err instanceof Error ? err.message : 'Import failed',
        size_bytes: file?.size || 0,
        file_type: file ? getUploadFileType(file) : 'unknown',
      });
      setError('Import failed. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-8">Import Conversations</h1>

        {(error || quickError) && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-400">{error || quickError}</p>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-8">
            {/* Primary: Quick Import Section */}
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold text-[rgb(var(--text))] mb-2">Quick Import (Recommended)</h2>
                <p className="text-[rgb(var(--muted))]">
                  Paste or upload a conversation from ChatGPT, Claude, or Cursor. INDEX will help you reduce it to what still matters.
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

            {/* Secondary: Advanced Import Section */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors text-left"
              >
                <div>
                  <h2 className="text-xl font-medium text-[rgb(var(--text))] mb-1">Import ChatGPT Export (Advanced)</h2>
                  <p className="text-sm text-[rgb(var(--muted))]">
                    Best for importing many conversations at once. Can take longer with queued background processing.
                  </p>
                </div>
                <span className="text-[rgb(var(--muted))] text-2xl">{showAdvanced ? '−' : '+'}</span>
              </button>

              {showAdvanced && (
                <Card className="p-6 mt-4">
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-400">
                        <strong>If you just want to try INDEX, start with Quick Import above.</strong> You can always do a full import later. Large exports may take a while; you can leave the tab open or come back.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">How to export from ChatGPT</h3>
                      <ol className="space-y-2 text-sm text-[rgb(var(--muted))] list-decimal list-inside">
                        <li>In ChatGPT, go to <strong>Settings → Data Controls → Export Data</strong></li>
                        <li>Download the ZIP, then extract and upload the <code className="bg-[rgb(var(--surface2))] px-1.5 py-0.5 rounded text-xs">conversations.json</code> file</li>
                        <li>INDEX will process your import in the background</li>
                      </ol>
                    </div>

                    <div>
                      <p className="text-sm text-[rgb(var(--muted))] mb-4">
                        You can assign conversations to projects during import or later from the Projects/Unassigned views.
                      </p>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                        disabled={loading}
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer inline-block px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Processing...' : 'Upload ChatGPT Export (JSON)'}
                      </label>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-medium text-[rgb(var(--text))] mb-4">
                Step 2 — Preview ({detectedConversations.length} conversations detected)
              </h2>
              <div className="space-y-3">
                {detectedConversations.map((conv) => (
                  <label
                    key={conv.id}
                    className="flex items-center gap-3 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={conv.selected}
                      onChange={() => handleToggleConversation(conv.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-[rgb(var(--text))]">{conv.title}</p>
                      <p className="text-sm text-[rgb(var(--muted))]">
                        {conv.messageCount} messages
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium text-[rgb(var(--text))] mb-4">Step 3 — Assign to Project</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="project-action"
                      value="none"
                      checked={projectAction === 'none'}
                      onChange={() => {
                        setProjectAction('none');
                        setSelectedProjectId('');
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[rgb(var(--text))]">Leave unassigned</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="project-action"
                      value="existing"
                      checked={projectAction === 'existing'}
                      onChange={() => setProjectAction('existing')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[rgb(var(--text))]">Assign to existing project</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="project-action"
                      value="new"
                      checked={projectAction === 'new'}
                      onChange={() => {
                        setProjectAction('new');
                        setSelectedProjectId('');
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[rgb(var(--text))]">Create new project</span>
                  </label>
                </div>

                {projectAction === 'existing' && (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}

                {projectAction === 'new' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="My New Project"
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--text))] mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="What is this project about?"
                        rows={2}
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-6 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    jobStatus ? (
                      `Importing... ${jobStatus.stepLabel || jobStatus.step || 'Processing'} (${jobStatus.percent || 0}%)`
                    ) : (
                      'Importing...'
                    )
                  ) : (
                    'Import Selected'
                  )}
                </button>
              </div>
              {loading && jobStatus && (
                <div className="text-sm text-[rgb(var(--muted))] pl-2">
                  {jobStatus.countStr && <p>{jobStatus.countStr}</p>}
                  {jobStatus.stepLabel && <p className="text-xs mt-1">Step: {jobStatus.stepLabel}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
