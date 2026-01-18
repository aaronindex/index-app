// app/projects/components/CreateProjectButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { showError, showSuccess } from '@/app/components/ErrorNotification';
import UpgradeModal from '@/app/components/billing/UpgradeModal';
import { track } from '@/lib/analytics/track';

export default function CreateProjectButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be signed in to create a project.');
      setLoading(false);
      return;
    }

    // Check project limit
    const limitResponse = await fetch('/api/billing/check-project-limit');
    const limitData = await limitResponse.json();

    if (!limitData.allowed) {
      setLoading(false);
      setIsOpen(false);
      setShowUpgrade(true);
      return;
    }

    // Check if this is the user's first project (before creating)
    const { data: profile } = await supabase
      .from('profiles')
      .select('has_created_project')
      .eq('id', user.id)
      .single();

    const isFirstProject = !profile?.has_created_project;

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      const errorMessage = insertError.message || 'Failed to create project';
      setError(errorMessage);
      showError(errorMessage);
      setLoading(false);
      return;
    }

    // Track first project created event (only once per user)
    if (isFirstProject && data) {
      // Fire analytics event
      track('first_project_created', {
        project_id_present: true,
        source: 'create_project',
      });

      // Update profile to mark that user has created a project
      await supabase
        .from('profiles')
        .update({ has_created_project: true })
        .eq('id', user.id);
    }

    // Reset form and close modal
    setName('');
    setDescription('');
    setIsOpen(false);
    showSuccess('Project created successfully!');
    router.refresh();
    
    // Navigate to the new project
    if (data) {
      router.push(`/projects/${data.id}`);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
      >
        Create Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[rgb(var(--surface))] rounded-2xl max-w-md w-full p-6 shadow-xl ring-1 ring-[rgb(var(--ring)/0.12)]">
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-4">
              Create New Project
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800">
                  <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium text-[rgb(var(--text))] mb-2"
                >
                  Project Name *
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                  placeholder="My Project"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="block text-sm font-medium text-[rgb(var(--text))] mb-2"
                >
                  Description (optional)
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg bg-[rgb(var(--surface))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ring)/0.2)]"
                  placeholder="What is this project about?"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setError(null);
                    setName('');
                    setDescription('');
                  }}
                  className="flex-1 px-4 py-2 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium text-[rgb(var(--text))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        source="paywall_project_limit"
      />
    </>
  );
}

