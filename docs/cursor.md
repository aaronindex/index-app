# AI Coding Guidelines for Personal AI Memory Project

You are helping build a production-grade MVP for a web app called “Ask Your Brain” (personal AI memory).

## Tech Stack (DO NOT CHANGE)

- Frontend + API: Next.js (App Router) + TypeScript
- Hosting: Vercel
- Auth, DB, Storage, Vector: Supabase (Postgres + pgvector)
- Background jobs: simple `jobs` table + cron/worker
- LLM provider (MVP): OpenAI

Do NOT suggest alternative stacks (Clerk, Firebase, Mongo, etc.). Work within this architecture.

## Core Domain

Users import their AI chat history, then:

- Ask questions across all conversations (“Ask My Brain”)
- Organize conversations into Projects
- Highlight parts of conversations
- Create Branch conversations from highlights
- Receive weekly intelligence summaries

Branching and highlights are first-class concepts:
- `highlights` table
- `conversations.parent_conversation_id`
- `conversations.origin_highlight_id`
- `branch_highlights` join table

Refer to `docs/mvp-spec.md` for schema details.

## How to Work

### 1. Always start with a checklist

When I ask for help with a feature, you must:

1. Restate the goal of the feature in 1–2 sentences.
2. Produce a numbered checklist of steps (5–10 items max).
3. Then implement steps **one at a time**.

Do NOT say “we’re done” until all checklist items are handled.

### 2. Never change the stack

- Do NOT introduce new providers or major architectural shifts.
- If existing code is inconsistent, adapt to the chosen stack as defined above.

### 3. Testing Requirements

For any non-trivial change:

- Provide **manual testing steps**:
  - “Click X, then Y; expect Z”
- Provide **at least one automated test** where reasonable:
  - Unit tests using Vitest
  - For pure functions (parsers, chunkers, query builders)

If I ask “how do I test this?”, respond with both:
- Manual steps
- `*.test.ts` example code

### 4. File / Project Organization

- Keep code modular and explicit:
  - `lib/` for domain logic (parsing, chunking, embeddings, search)
  - `app/` for Next.js routes and UI
  - `db/` or similar for DB/schema definitions
- Avoid giant “god files”. If a file exceeds ~300 lines, suggest splitting.

### 5. Data Model Constraints

Follow the schema in `docs/mvp-spec.md` (or equivalent):

- Use existing tables:
  - `profiles`, `imports`, `conversations`, `messages`,
    `message_chunks`, `message_chunk_embeddings`,
    `highlights`, `highlight_embeddings`,
    `projects`, `project_conversations`,
    `weekly_digests`, `jobs`, `branch_highlights`
- Use `user_id` and Row Level Security consistently.
- Do NOT add new tables without being asked.

### 6. AI Usage

Wrap OpenAI calls in small, reusable helpers:

- `embedText(text: string): Promise<number[]>`
- `answerQuery(query: string, chunks: Chunk[]): Promise<{ answer: string; sources: SourceRef[] }>`
- `generateWeeklyDigest(...)`

These should live in `lib/ai/` or similar.

Do NOT inline raw OpenAI calls everywhere.

### 7. Feature Boundaries (MVP)

We are currently focused ONLY on MVP:

- Manual import of ChatGPT exports
- Ask My Brain (global search + answer)
- Projects (manual attach)
- Highlights & creating branches from highlights
- Weekly digest

Do NOT implement:

- Browser extension
- Visual maps / orbs
- Team features
- Public sharing

If you think a new feature is needed, ask explicitly before adding.

### 8. Communication Style

When you respond:

- List all files you changed or created.
- Explain **why** key decisions were made (1–3 sentences).
- Keep answers grounded and specific to this codebase.

If you are unsure about existing code context, say so and ask to see the relevant files.
