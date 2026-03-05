// Stub page for browser extension install; update with install instructions or external link as needed.
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Extension | INDEX',
  description: 'Install the INDEX Quick Capture browser extension',
};

export default function ExtensionPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">
          Quick Capture extension
        </h1>
        <p className="text-[rgb(var(--text))] mb-6">
          Install the INDEX browser extension to capture selected text from any page and send it to INDEX.
        </p>
        <p className="text-sm text-[rgb(var(--muted))] mb-8">
          Install instructions and download links can be added here.
        </p>
        <Link
          href="/home"
          className="text-sm text-[rgb(var(--text))] hover:opacity-80 transition-opacity underline"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
