// app/terms/page.tsx
// Terms of Use page

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-sm max-w-none text-[rgb(var(--text))]">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[rgb(var(--text))] mb-4">Terms of Use — INDEX</h1>
          
          <p className="text-[rgb(var(--muted))] mb-6">
            <strong>Effective Date:</strong> January 8, 2026
          </p>

          <p className="mb-6">
            By using INDEX ("the app"), you agree to the following:
          </p>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">1. Nature of the Service</h2>
            <p className="mb-4">INDEX is a search and organization tool for imported AI conversation exports. It is:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Not therapy</strong></li>
              <li><strong>Not medical advice</strong></li>
              <li><strong>Not financial advice</strong></li>
              <li><strong>Not crisis support</strong></li>
            </ul>
            <p>All responses, summaries, or suggestions are <strong>informational and best-effort only</strong>.</p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">2. Data Ownership</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>You own your data, including imported conversations and derived artifacts (highlights, tasks, decisions)</li>
              <li>You may export or delete your data at any time</li>
              <li>Your data is <strong>not used to train AI models</strong></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">3. Uptime & Reliability</h2>
            <p>
              This is an <strong>alpha product</strong>. We make a best-effort attempt to maintain uptime but do not guarantee uninterrupted availability.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">4. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use INDEX for illegal activities</li>
              <li>Attempt to breach, scrape, or reverse-engineer the system</li>
              <li>Upload malware or harmful code</li>
              <li>Use the service to generate or distribute harm</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">5. Liability</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>The app is provided "as is"</li>
              <li>We are not liable for lost data, outages, or incorrect interpretations</li>
              <li>You are responsible for decisions made based on app outputs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">6. Access & Termination</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>We may grant or revoke access at any time during alpha</li>
              <li>We may update these terms later; continued use constitutes acceptance of updates</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">7. Cookies Notice</h2>
            <p className="mb-4">
              INDEX uses minimal cookies to support login and analytics. Continued use constitutes consent under the conditions described in the Privacy Policy.
            </p>
            <p>
              For deletion requests, contact:{' '}
              <a
                href="mailto:legal@indexapp.co"
                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] underline"
              >
                legal@indexapp.co
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

