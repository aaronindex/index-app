// app/terms/page.tsx
// Terms of Use page

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[rgb(var(--text))] mb-4">
            Terms of Use
          </h1>
          <p className="text-sm text-[rgb(var(--muted))]">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-[rgb(var(--text))]">
          {/* PLACE TERMS OF USE COPY HERE */}
          {/* 
            Replace the paragraph below with your full terms of use text.
            You can use standard HTML tags for formatting (p, h2, h3, ul, ol, li, strong, em, a, etc.)
          */}
          <p className="text-[rgb(var(--muted))]">
            This document will be posted here shortly.
          </p>
        </div>
      </div>
    </main>
  );
}

