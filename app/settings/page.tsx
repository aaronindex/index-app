// app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

interface Profile {
  plan: string;
  plan_status: string | null;
}

export default function SettingsPage() {
  // Update page title
  useEffect(() => {
    document.title = 'Settings | INDEX';
  }, []);
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/export');
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `index-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Fetch user profile to check plan status
  useEffect(() => {
    async function fetchProfile() {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingProfile(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, plan_status')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
      setLoadingProfile(false);
    }
    fetchProfile();
  }, []);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setCanceling(true);
    setCancelError(null);
    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      const data = await response.json();
      setCancelSuccess(true);
      
      // Refresh profile to show updated status
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('plan, plan_status')
          .eq('id', user.id)
          .single();
        if (profileData) {
          setProfile(profileData);
        }
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      setCancelError(error instanceof Error ? error.message : 'Failed to cancel subscription. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      // Redirect to home after successful deletion
      router.push('/');
      // Sign out will be handled by the API
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete account. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/projects"
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">Settings</h1>
          <p className="text-[rgb(var(--muted))]">
            Manage your account and data
          </p>
        </div>

        <div className="space-y-8">
          {/* Subscription Management */}
          {!loadingProfile && profile && (
            <div className="rounded-xl p-6 bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.08)]">
              <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-2">Subscription</h2>
              {profile.plan === 'pro' ? (
                <>
                  <div className="mb-4">
                    <p className="text-[rgb(var(--text))] font-medium mb-1">
                      Current Plan: <span className="text-[rgb(var(--muted))]">Pro</span>
                    </p>
                    {profile.plan_status === 'canceled' ? (
                      <p className="text-sm text-[rgb(var(--muted))]">
                        Your subscription has been canceled. You will retain access until the end of your billing period.
                      </p>
                    ) : (
                      <p className="text-sm text-[rgb(var(--muted))]">
                        $30/month • Active subscription
                      </p>
                    )}
                  </div>
                  {cancelSuccess ? (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-400">
                        Subscription canceled. You will retain access until the end of your billing period.
                      </p>
                    </div>
                  ) : profile.plan_status !== 'canceled' ? (
                    <>
                      {cancelError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-800 dark:text-red-400">{cancelError}</p>
                        </div>
                      )}
                      <button
                        onClick={handleCancelSubscription}
                        disabled={canceling}
                        className="px-4 py-2 border border-[rgb(var(--ring)/0.12)] text-[rgb(var(--text))] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {canceling ? 'Canceling...' : 'Cancel Subscription'}
                      </button>
                      <p className="text-xs text-[rgb(var(--muted))] mt-2">
                        Canceling will stop future charges. You'll keep access until the end of your billing period.
                      </p>
                    </>
                  ) : null}
                </>
              ) : (
                <div>
                  <p className="text-[rgb(var(--text))] font-medium mb-1">
                    Current Plan: <span className="text-[rgb(var(--muted))]">Free</span>
                  </p>
                  <p className="text-sm text-[rgb(var(--muted))] mb-4">
                    Upgrade to Pro for unlimited projects, full imports, and more.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-block px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    View Pricing
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Data Export */}
          <div className="rounded-xl p-6 bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.08)]">
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-2">Export Your Data</h2>
            <p className="text-[rgb(var(--muted))] mb-4">
              Download all your data as a JSON file. This includes your projects, conversations,
              messages, highlights, and all other data stored in INDEX.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Export All Data'}
            </button>
          </div>

          {/* Feedback */}
          <div className="rounded-xl p-6 bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.08)]">
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-2">Feedback</h2>
            <p className="text-[rgb(var(--muted))] mb-4">
              Help us improve INDEX. Share bugs, feature requests, or suggestions.
            </p>
            <Link
              href="/feedback"
              className="inline-block px-4 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Submit Feedback
            </Link>
          </div>

          {/* Privacy Notice */}
          <div className="rounded-xl p-6 bg-[rgb(var(--surface))] ring-1 ring-[rgb(var(--ring)/0.08)]">
            <h2 className="font-serif text-xl font-semibold text-[rgb(var(--text))] mb-2">Your Privacy</h2>
            <p className="text-[rgb(var(--muted))] mb-4">
              <strong className="text-[rgb(var(--text))]">We do not train AI models on your data.</strong>
            </p>
            <p className="text-[rgb(var(--muted))] mb-4">
              Your conversations, highlights, and all data stored in INDEX are private and belong to you.
              We use your data only to provide the INDEX service—search, organization, and summaries.
              We never use your data to train AI models or share it with third parties.
            </p>
            <Link
              href="/privacy"
              className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              Read our full privacy policy →
            </Link>
          </div>

          {/* Delete Account */}
          <div className="border border-red-200 dark:border-red-900/30 rounded-lg p-6 bg-red-50 dark:bg-red-900/10">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-2">
              Delete Account
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-red-700 dark:text-red-300 text-sm">
                  Type <strong>DELETE</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-2 border border-red-300 dark:border-red-800 rounded-lg bg-white dark:bg-zinc-950 text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== 'DELETE'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={deleting}
                    className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-foreground rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

