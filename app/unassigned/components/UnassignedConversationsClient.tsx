// app/unassigned/components/UnassignedConversationsClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import Link from 'next/link';

interface Conversation {
  id: string;
  title: string | null;
  messageCount: number;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
}

interface UnassignedConversationsClientProps {
  conversations: Conversation[];
  projects: Project[];
}

export default function UnassignedConversationsClient({
  conversations,
  projects,
}: UnassignedConversationsClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignAction, setAssignAction] = useState<'existing' | 'new'>('existing');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map((c) => c.id)));
    }
  };

  const handleDelete = async (conversationId: string) => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete conversation');
        setDeleting(false);
        return;
      }

      // Remove from selection if selected
      const newSelected = new Set(selectedIds);
      newSelected.delete(conversationId);
      setSelectedIds(newSelected);

      // Refresh the page
      router.refresh();
      setDeleteConfirmId(null);
    } catch (err) {
      setError('Failed to delete conversation');
      console.error(err);
      setDeleting(false);
    }
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) {
      setError('Please select at least one conversation.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be signed in.');
        setLoading(false);
        return;
      }

      let finalProjectId: string | null = null;

      // Create project if needed
      if (assignAction === 'new' && newProjectName.trim()) {
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: newProjectName.trim(),
            description: newProjectDescription.trim() || null,
          })
          .select()
          .single();

        if (projectError || !newProject) {
          setError(projectError?.message || 'Failed to create project.');
          setLoading(false);
          return;
        }

        finalProjectId = newProject.id;
      } else if (assignAction === 'existing' && selectedProjectId) {
        finalProjectId = selectedProjectId;
      } else {
        setError('Please select or create a project.');
        setLoading(false);
        return;
      }

      // Assign conversations to project
      const assignments = Array.from(selectedIds).map((conversationId) => ({
        project_id: finalProjectId,
        conversation_id: conversationId,
      }));

      const { error: assignError } = await supabase
        .from('project_conversations')
        .insert(assignments);

      if (assignError) {
        setError(assignError.message);
        setLoading(false);
        return;
      }

      // Success - redirect to project
      router.push(`/projects/${finalProjectId}?assigned=${selectedIds.size}`);
    } catch (err) {
      setError('Failed to assign conversations.');
      console.error(err);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">Unassigned Conversations</h1>
          <p className="text-[rgb(var(--muted))]">
            Conversations that haven't been assigned to a project yet.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No unassigned conversations. All your conversations are organized in projects.
            </p>
            <Link
              href="/projects"
              className="inline-block px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              View Projects
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === conversations.length && conversations.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Select all ({selectedIds.size} selected)
                  </span>
                </label>
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                >
                  Assign Selected ({selectedIds.size})
                </button>
              )}
            </div>

            <div className="space-y-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-3 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors bg-white dark:bg-zinc-950"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(conversation.id)}
                    onChange={() => toggleSelection(conversation.id)}
                    className="w-4 h-4"
                  />
                  <Link
                    href={`/conversations/${conversation.id}`}
                    className="flex-1 hover:opacity-80 transition-opacity"
                  >
                    <h3 className="font-medium text-foreground mb-1">
                      {conversation.title || 'Untitled Conversation'}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>{conversation.messageCount} messages</span>
                      <span>Created: {formatDate(conversation.createdAt)}</span>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteConfirmId(conversation.id);
                    }}
                    className="px-3 py-1 text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Assign {selectedIds.size} Conversation{selectedIds.size > 1 ? 's' : ''}
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="assign-action"
                      value="existing"
                      checked={assignAction === 'existing'}
                      onChange={() => setAssignAction('existing')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">Assign to existing project</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="assign-action"
                      value="new"
                      checked={assignAction === 'new'}
                      onChange={() => setAssignAction('new')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">Create new project</span>
                  </label>
                </div>

                {assignAction === 'existing' && (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}

                {assignAction === 'new' && (
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
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
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
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setError(null);
                      setSelectedProjectId('');
                      setNewProjectName('');
                      setNewProjectDescription('');
                    }}
                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Delete Conversation</h2>

              <p className="text-zinc-700 dark:text-zinc-300 mb-6">
                Are you sure you want to delete this conversation?
                <br />
                <span className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 block">
                  This will permanently delete all messages, highlights, and related data. This action cannot be undone.
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteConfirmId(null);
                    setError(null);
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

