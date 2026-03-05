// app/notes/the-ledger-for-thinking/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Ledger for Thinking',
  description: 'A short note on why INDEX v2 exists, and how it acts as a ledger for thinking.',
};

export default function TheLedgerForThinking() {
  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <article className="max-w-prose mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[rgb(var(--text))] mb-12">
          The Ledger for Thinking
        </h1>

        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <p>
              Most of my thinking now happens in conversations with AI.
            </p>
            <p>
              A question leads to an idea.
              <br />
              An idea leads to a long thread.
              <br />
              A thread leads to five more.
            </p>
            <p>
              By the end of the day there are dozens of conversations across ChatGPT, Claude, and Cursor. Some contain
              real breakthroughs. Most are fragments of thinking that felt important at the time.
            </p>
            <p>The problem is not generating ideas.</p>
            <p>
              The problem is <strong>remembering what actually mattered.</strong>
            </p>
            <p>
              AI makes it incredibly easy to think.
              <br />
              It also makes it incredibly easy to lose the thread.
            </p>
            <p>INDEX was built to solve that problem.</p>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">
              A ledger for thinking
            </h2>
            <p>
              Most tools help you generate ideas.
              <br />
              INDEX helps you <strong>see where those ideas are going.</strong>
            </p>
            <p>INDEX is not another place to think.</p>
            <p>
              Thinking happens wherever it already happens — in conversations, notes, documents, or long walks. INDEX
              exists <strong>after</strong> thinking.
            </p>
            <p>You capture moments of thinking and reduce them to the signals that still matter:</p>
            <ul>
              <li>decisions</li>
              <li>results</li>
              <li>highlights</li>
            </ul>
            <p>
              Over time those signals accumulate. Structure begins to appear. INDEX reflects that structure back to you.
            </p>
            <p>Direction is not invented.</p>
            <p>
              It <strong>emerges.</strong>
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">
              The core loop
            </h2>
            <p>The system is intentionally simple:</p>
            <p>Think anywhere → capture → reduce → continue thinking.</p>
            <p>
              You import conversations or fragments of thinking.
              <br />
              You reduce them to the pieces that carry weight.
            </p>
            <p>Everything else fades.</p>
            <p>From those signals, INDEX reveals the shape of your thinking:</p>
            <ul>
              <li>Direction shows the current structural posture.</li>
              <li>Shifts mark meaningful changes.</li>
              <li>Timeline shows the tempo of change over time.</li>
            </ul>
            <p>INDEX doesn&apos;t try to tell you what to do.</p>
            <p>It simply makes the structure visible.</p>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">
              Why this matters
            </h2>
            <p>AI dramatically increases the volume of thinking we can generate.</p>
            <p>But without structure, that thinking dissolves into noise.</p>
            <p>
              INDEX exists to create <strong>continuity</strong> — a quiet record of what actually happened in your
              thinking over time.
            </p>
            <p>Not another productivity system.</p>
            <p>Just a ledger.</p>
          </section>

          <section className="mt-10">
            <p>
              If you find yourself thinking across many conversations and wondering where it’s all going, INDEX was
              built for you.
            </p>
            <p className="mt-6">— Aaron</p>
          </section>
        </div>
      </article>
    </main>
  );
}

