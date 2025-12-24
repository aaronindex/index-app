// app/settings/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/projects"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Settings</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your account and data
          </p>
        </div>

        <div className="space-y-8">
          {/* Data Export */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
            <h2 className="text-xl font-semibold text-foreground mb-2">Export Your Data</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Download all your data as a JSON file. This includes your projects, conversations,
              messages, highlights, and all other data stored in INDEX.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Export All Data'}
            </button>
          </div>

          {/* Feedback */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
            <h2 className="text-xl font-semibold text-foreground mb-2">Feedback</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Help us improve INDEX. Share bugs, feature requests, or suggestions.
            </p>
            <Link
              href="/feedback"
              className="inline-block px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Submit Feedback
            </Link>
          </div>

          {/* Privacy Notice */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
            <h2 className="text-xl font-semibold text-foreground mb-2">Your Privacy</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              <strong className="text-foreground">We do not train AI models on your data.</strong>
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Your conversations, highlights, and all data stored in INDEX are private and belong to you.
              We use your data only to provide the INDEX service—search, organization, and summaries.
              We never use your data to train AI models or share it with third parties.
            </p>
            <Link
              href="/privacy"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
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

