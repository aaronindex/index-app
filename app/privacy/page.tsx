// app/privacy/page.tsx
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/settings"
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors mb-4 inline-block"
          >
            ← Back to Settings
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">Privacy Policy</h1>
          <p className="text-[rgb(var(--muted))]">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">Your Data, Your Control</h2>
            <p className="text-[rgb(var(--text))]">
              INDEX is built on the principle that your data belongs to you. We provide tools to help
              you organize and search your AI conversations, but we never claim ownership of your content.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">
              We Do Not Train AI Models on Your Data
            </h2>
            <p className="text-[rgb(var(--text))] mb-4">
              <strong className="text-[rgb(var(--text))]">This is our core commitment:</strong> We do not use
              your conversations, highlights, or any data stored in INDEX to train AI models. Your data
              is used solely to provide the INDEX service—search, organization, and summaries.
            </p>
            <p className="text-[rgb(var(--text))]">
              When we use AI services (like OpenAI for embeddings), we send your data only for the
              purpose of generating searchable representations. We do not allow these services to use
              your data for training their models.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">What We Collect</h2>
            <p className="text-[rgb(var(--text))] mb-4">
              INDEX stores the following data that you provide:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[rgb(var(--text))] ml-4">
              <li>Your imported conversations and messages</li>
              <li>Highlights and annotations you create</li>
              <li>Projects and organizational structures</li>
              <li>Branches and relationships between conversations</li>
              <li>Search embeddings (vector representations for search functionality)</li>
              <li>Account information (email, profile settings)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">How We Use Your Data</h2>
            <p className="text-[rgb(var(--text))] mb-4">
              We use your data exclusively to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[rgb(var(--text))] ml-4">
              <li>Provide search functionality across your conversations</li>
              <li>Organize and display your data in projects, branches, and highlights</li>
              <li>Generate summaries and digests (when you request them)</li>
              <li>Maintain your account and preferences</li>
            </ul>
            <p className="text-[rgb(var(--text))] mt-4">
              We do not sell, share, or use your data for any purpose other than providing the INDEX service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">Data Storage and Security</h2>
            <p className="text-[rgb(var(--text))] mb-4">
              Your data is stored securely using Supabase (PostgreSQL) with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[rgb(var(--text))] ml-4">
              <li>Row-level security (RLS) ensuring only you can access your data</li>
              <li>Encrypted connections (HTTPS) for all data transmission</li>
              <li>Secure authentication via Supabase Auth</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">Your Rights</h2>
            <p className="text-[rgb(var(--text))] mb-4">
              You have full control over your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[rgb(var(--text))] ml-4">
              <li>
                <strong>Export:</strong> Download all your data as JSON at any time from Settings
              </li>
              <li>
                <strong>Delete:</strong> Permanently delete your account and all associated data
              </li>
              <li>
                <strong>Access:</strong> View and manage all your data through the INDEX interface
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">Third-Party Services</h2>
            <p className="text-[rgb(var(--text))] mb-4">
              INDEX uses the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[rgb(var(--text))] ml-4">
              <li>
                <strong>Supabase:</strong> Database and authentication. See their privacy policy at{' '}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] underline"
                >
                  supabase.com/privacy
                </a>
              </li>
              <li>
                <strong>OpenAI:</strong> For generating embeddings (vector representations) for search.
                We use their API with data processing agreements that prevent training on your data.
              </li>
              <li>
                <strong>Vercel:</strong> Hosting and deployment. See their privacy policy at{' '}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] underline"
                >
                  vercel.com/legal/privacy-policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">Changes to This Policy</h2>
            <p className="text-[rgb(var(--text))]">
              We may update this privacy policy from time to time. We will notify you of any material
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">Contact Us</h2>
            <p className="text-[rgb(var(--text))]">
              If you have questions about this privacy policy or how we handle your data, please contact
              us at{' '}
              <a
                href="mailto:aaron@indexapp.co"
                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] underline"
              >
                aaron@indexapp.co
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

