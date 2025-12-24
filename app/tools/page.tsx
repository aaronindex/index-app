// app/tools/page.tsx
import Link from 'next/link';
import GenerateDigestButton from './components/GenerateDigestButton';

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-semibold text-foreground mb-8">Tools</h1>
        
        <div className="space-y-6">
          {/* Weekly Digest */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-950">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Weekly Digest</h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  Generate an AI-powered summary of your conversations and open loops for any week.
                </p>
              </div>
              <Link
                href="/digests"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                View All →
              </Link>
            </div>
            <GenerateDigestButton />
          </div>

          {/* Coming Soon */}
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold text-foreground mb-2">Coming Soon</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Additional tools like Summary, Review, and Decisions will be available here.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

