// app/import/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { parseChatGPTExport } from '@/lib/parsers/chatgpt';
import QuickImportModal from './components/QuickImportModal';
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
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedConversations, setDetectedConversations] = useState<DetectedConversation[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectAction, setProjectAction] = useState<'none' | 'existing' | 'new'>('none');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showQuickImport, setShowQuickImport] = useState(false);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  // Check for quick import query param and project pre-selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('quick') === 'true') {
      setShowQuickImport(true);
      // Clean up URL
      router.replace('/import', { scroll: false });
    }
    
    // Pre-select project if provided in URL
    const projectIdFromUrl = params.get('project');
    if (projectIdFromUrl) {
      // Fetch projects first, then set the selected project
      const fetchProjectsAndSelect = async () => {
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
            // Ensure projects is always an array
            const projectsArray = Array.isArray(userProjects) ? userProjects : [];
            setProjects(projectsArray);
            // Check if the project from URL exists in user's projects
            const projectExists = projectsArray.some(p => p.id === projectIdFromUrl);
            if (projectExists) {
              setSelectedProjectId(projectIdFromUrl);
              setProjectAction('existing');
            }
          }
        }
      };
      
      fetchProjectsAndSelect();
    }
  }, [router]);

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
      // Read and parse the file
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      console.log('[Import] File parsed successfully. Root type:', Array.isArray(data) ? 'array' : typeof data);
      console.log('[Import] Root keys:', typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A');

      // Parse conversations using the parser
      const parsedConversations = parseChatGPTExport(data);
      
      console.log('[Import] Parsed conversations:', parsedConversations.length);
      
      if (parsedConversations.length === 0) {
        setError(
          'No conversations detected in the file. Please ensure it is a valid ChatGPT export. Check the browser console for details.'
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

      // Fetch user's projects
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
          // Ensure projects is always an array
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

  // Helper function to determine file type from File object
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

    // Track import start time
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

      // Upload file to Supabase Storage (or process directly)
      const fileText = await file.text();
      const fileData = JSON.parse(fileText);

      // Create import record
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

      // Determine project assignment
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

      // Track import started on submit (after determining project, before API call)
      trackEvent('import_started', {
        import_type: 'file_upload',
        conversation_count: selected.length,
        has_project: !!finalProjectId || !!newProjectData,
        size_bytes: file.size || 0,
        file_type: getUploadFileType(file),
      });
      
      // Debug logging
      if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === 'true') {
        console.log('[Analytics] import_started (file_upload)', {
          size_bytes: file.size,
          file_type: getUploadFileType(file),
        });
      }

      // Queue the import job
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
        
        // Track limit hit if 429
        if (response.status === 429) {
          trackEvent('limit_hit', {
            limit_type: 'import',
          });
        }
        
        // Track import failed
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

      // Job queued - start polling for status
      const result = await response.json();
      const jobId = result.jobId;
      
      // Poll for job completion
      const maxPolls = 200; // 200 * 3s = 10 minutes max
      
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
            // Job not found - might still be creating or there's a delay
            console.warn('[Import] Job not found in list, poll count:', localPollCount);
            if (localPollCount >= 10) {
              // After 30 seconds, if job still not found, show error
              clearInterval(pollInterval);
              setError('Import job not found. Please try importing again.');
              setLoading(false);
            }
            return;
          }
          
          // Update job status for UI feedback
          setJobStatus(currentJob);
          
          // Log progress for debugging
          if (localPollCount % 10 === 0) {
            console.log('[Import] Job status:', {
              step: currentJob.step,
              status: currentJob.status,
              percent: currentJob.percent,
              counts: currentJob.counts,
            });
          }
          
          if (currentJob.status === 'complete') {
            clearInterval(pollInterval);
            setLoading(false);
            
            // Calculate latency
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
            
            // Redirect to project or unassigned
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
          // Otherwise continue polling (status is 'pending' or in progress)
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
      }, 3000); // Poll every 3 seconds

      // Stop polling after 10 minutes (safety timeout)
      // Note: pollCount check in the interval also handles this, but this is a backup
      setTimeout(() => {
        clearInterval(pollInterval);
        // Only show error if still loading (pollInterval might have already cleared)
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-medium text-foreground mb-4">Step 1 — Choose Source</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center">
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
                    className="cursor-pointer inline-block px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    {loading ? 'Processing...' : 'Upload ChatGPT Export (JSON)'}
                  </label>
                  <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                    Select a JSON file exported from ChatGPT
                  </p>
                </div>
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center">
                  <button
                    onClick={() => setShowQuickImport(true)}
                    className="px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
                    disabled={loading}
                  >
                    Quick Import (Paste One Conversation)
                  </button>
                  <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                    Paste a single conversation transcript
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-medium text-foreground mb-4">
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
                      <p className="font-medium text-foreground">{conv.title}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {conv.messageCount} messages
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium text-foreground mb-4">Step 3 — Assign to Project</h2>
              
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
                    <span className="text-sm text-foreground">Leave unassigned</span>
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
                    <span className="text-sm text-foreground">Assign to existing project</span>
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
                    <span className="text-sm text-foreground">Create new project</span>
                  </label>
                </div>

                {projectAction === 'existing' && (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
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
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="My New Project"
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="What is this project about?"
                        rows={2}
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
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
                  className="px-6 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
      <QuickImportModal isOpen={showQuickImport} onClose={() => setShowQuickImport(false)} />
    </main>
  );
}

