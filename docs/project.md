# Project: Personal AI Memory / “Ask Your Brain”

## One-Sentence Thesis

We turn your AI conversations into a private, living memory you can search, summarize, branch, and grow over time.

---

## One-Pager North Star

INDEX — One-Pager North Star
Personal Business Intelligence for your AI life.
What Index Is

Index is your Personal BI layer — a private memory system that turns your AI conversations into actionable intelligence.
You think in GPT, Claude, Cursor, Slack.
Index captures the meaning of all that thinking — and makes it usable.

Index is not a chat interface.
It is the sensemaking system for your AI-powered life.

The Problem

People generate more ideas, insights, and problem-solving in AI chats than anywhere else — but:

Everything is ephemeral

Nothing is organized

Context disappears

Decisions vanish

Themes get lost

There is no “memory” of who you are across conversations

AI amplifies thinking…
but destroys continuity.

Index restores it.

The Solution

Index imports your AI conversations and transforms them into a structured, searchable, evolving memory graph:

Projects → containers for related work

Chats → imported conversations

Branches → sub-threads created from highlights

Highlights → atomic units of meaning

Status → Priority, Open, Complete, Dormant

Decisions → permanent record of commitments

Weekly Digest → narrative intelligence summary

Toolbelt → Summary, Review, Decisions, Digest

You never lose a thought.
You always know what’s important.
You always understand what changed.

What Index Does
1. Imports your thinking

From:

OpenAI

Claude

Cursor

Slack

JSON exports

(future) browser extension

2. Organizes it automatically

Into:

Projects

Chats

Branches

Theme clusters

Highlights

Status states

3. Surfaces meaning

Through:

Semantic search

Weekly intelligence

Decisions tracking

Signals (future instruments)

Status-based filtering

Toolbelt superpowers

4. Gives you a cognitive operating system

Index shows:

What matters now

What’s changed

What’s unresolved

What you decided

What needs reorientation

It’s clarity-on-demand.

Core Philosophy

Branches hold thinking.
Instruments hold change.

Index is:

Simple by design

Calm by default

A layer of meaning, not noise

Your executive memory

Your long-term context engine

An operating system for ideas and decisions

Who It's For

Founders

Creators

Knowledge workers

Builders

Strategists

Anyone using AI as their thinking partner

These people already rely on AI as their “working memory.”
Index becomes their long-term memory.

Category

Personal Business Intelligence (PBI).
A new category.

Not PKM.
Not a journaling app.
Not a task manager.
Not a chat interface.

Index is Business Intelligence for your mind.

Why Index Matters

AI amplifies thinking — but it explodes context.

Index brings back:

Continuity

Coherence

Structure

Recall

Direction

Compound insights

Everything you think becomes reusable.
Your ideas compound over time.
Your decisions stop evaporating.
Your vision gets clearer week by week.

The Vision

A simple, powerful system where:

All your AI thinking lives

All your progress becomes visible

Your ideas connect

Your decisions accumulate

Your life + work become intelligible

Index is where your mind takes shape.

---

## Core User Problem

- Users do a ton of thinking in AI (ChatGPT, Claude, etc.).
- Those conversations are:
  - Hard to find later
  - Not organized by theme, project, or relationship
  - Full of dense, reusable insight that gets lost

We want to:
> Capture that thinking, organize it, and give people a way to query and branch it like a real brain.

---

## MVP Scope (Non-Negotiable)

A user can:

1. **Import AI chats** (starting with ChatGPT export)  
2. **Ask questions across all their past conversations** (“Ask My Brain”)  
3. **Attach conversations to simple Projects** (user-organized)  
4. **Receive a weekly intelligence summary** of their own thinking  
5. **Highlight parts of a conversation and create Branches** (sub-chats) from those highlights  

We do **not** ship:

- Browser extension / auto-capture  
- Visual maps / orbs / field  
- Team / multi-user spaces  
- Sophisticated theme/emotion analytics  

Those are later phases.

---

## Tech Stack (MVP)

- Frontend / API: **Next.js + TypeScript** (App Router)
- Hosting: **Vercel**
- Auth + DB + Storage + Vector: **Supabase** (Postgres + pgvector)
- Background jobs: simple **`jobs`** table + cron/worker
- AI Provider (MVP): **OpenAI** (abstracted so we can swap later)

---

## Core Data Model (MVP + baked-in branching)

### 1. Users & Profiles

Supabase `auth.users` +:

**`profiles`**

- `id` (UUID, PK, FK → auth.users.id)  
- `created_at` (timestamptz)  
- `plan` (text) – `'trial' | 'pro' | 'free'`  
- `trial_ends_at` (timestamptz, nullable)  
- `billing_customer_id` (text, nullable)  
- `weekly_digest_enabled` (boolean, default true)  
- `time_zone` (text, e.g. `'America/Denver'`)  

---

### 2. Imports & Conversations

**`imports`** – each file or ingest event

- `id` (UUID, PK)  
- `user_id` (UUID, FK → profiles.id)  
- `source` (text) – `'chatgpt_export' | 'manual_paste' | ...`  
- `status` (text) – `'pending' | 'processing' | 'complete' | 'error'`  
- `error_message` (text, nullable)  
- `raw_file_path` (text) – storage path  
- `processed_at` (timestamptz, nullable)  
- `created_at` (timestamptz)  

**`conversations`**

- `id` (UUID, PK)  
- `user_id` (UUID, FK)  
- `import_id` (UUID, FK → imports.id, nullable)  
- `title` (text, nullable)  
- `source` (text) – `'chatgpt' | 'claude' | 'native'`  
- `started_at` (timestamptz)  
- `ended_at` (timestamptz, nullable)  
- `parent_conversation_id` (UUID, nullable, FK → conversations.id)  
- `origin_highlight_id` (UUID, nullable, FK → highlights.id)  
- `created_at` (timestamptz)  

> `parent_conversation_id` + `origin_highlight_id` = branching:  
> a “branch” conversation points back to the original conversation + the highlight it came from.

**`messages`**

- `id` (UUID, PK)  
- `conversation_id` (UUID, FK)  
- `role` (text) – `'user' | 'assistant' | 'system'`  
- `content` (text)  
- `index_in_conversation` (int)  
- `created_at` (timestamptz)  

---

### 3. Chunks & Embeddings

We chunk messages into smaller units for search.

**`message_chunks`**

- `id` (UUID, PK)  
- `user_id` (UUID, FK → profiles.id)  
- `conversation_id` (UUID, FK → conversations.id)  
- `message_id` (UUID, FK → messages.id)  
- `content` (text) – chunk text (e.g. 500–1000 tokens)  
- `chunk_index` (int)  
- `created_at` (timestamptz)  

**`message_chunk_embeddings`**

- `chunk_id` (UUID, PK, FK → message_chunks.id)  
- `embedding` (vector) – pgvector  
- `created_at` (timestamptz)  

---

### 4. Highlights & Branch Links

**`highlights`**

- `id` (UUID, PK)  
- `user_id` (UUID, FK)  
- `conversation_id` (UUID, FK)  
- `message_id` (UUID, FK)  
- `content` (text) – selected text  
- `start_offset` (int, nullable)  
- `end_offset` (int, nullable)  
- `label` (text, nullable) – user-given short title like “MVP schema”  
- `created_at` (timestamptz)  

**`highlight_embeddings`**

- `highlight_id` (UUID, PK, FK → highlights.id)  
- `embedding` (vector)  
- `created_at` (timestamptz)  

**`branch_highlights`** (optional, but baked in)

- `branch_conversation_id` (UUID, FK → conversations.id)  
- `highlight_id` (UUID, FK → highlights.id)  
- `created_at` (timestamptz)  
- PK: (`branch_conversation_id`, `highlight_id`)  

> For MVP we can start with 1 highlight → 1 branch,  
> but this table allows branches from multiple highlights later.

---

### 5. Projects (User Organization)

**`projects`**

- `id` (UUID, PK)  
- `user_id` (UUID, FK)  
- `name` (text)  
- `description` (text, nullable)  
- `created_at` (timestamptz)  

**`project_conversations`**

- `project_id` (UUID, FK → projects.id)  
- `conversation_id` (UUID, FK → conversations.id)  
- `created_at` (timestamptz)  
- PK: (`project_id`, `conversation_id`)  

---

### 6. Weekly Digests

**`weekly_digests`**

- `id` (UUID, PK)  
- `user_id` (UUID, FK)  
- `week_start` (date)  
- `week_end` (date)  
- `summary` (text) – main narrative  
- `top_themes` (jsonb) – e.g. `[{ "theme": "pricing", "weight": 0.8 }, ...]`  
- `open_loops` (jsonb) – e.g. refs to conversations/snippets  
- `email_sent_at` (timestamptz, nullable)  
- `created_at` (timestamptz)  

---

### 7. Jobs (Background Work)

**`jobs`**

- `id` (UUID, PK)  
- `user_id` (UUID, FK)  
- `type` (text) – `'import_processing' | 'weekly_digest' | 'conversation_summary' | ...`  
- `payload` (jsonb)  
- `status` (text) – `'pending' | 'running' | 'complete' | 'error'`  
- `error_message` (text, nullable)  
- `run_at` (timestamptz)  
- `created_at` (timestamptz)  
- `updated_at` (timestamptz)  

---

## MVP Features (Checkable List)

- [ ] Auth + profile (Supabase)
- [ ] Manual import of ChatGPT export
- [ ] Import processing → conversations/messages/chunks/embeddings
- [ ] “Ask My Brain” AI search across chunks
- [ ] Projects: create + attach conversations
- [ ] Highlights: select text in a conversation → save highlight
- [ ] Create branch conversation from a highlight
- [ ] Weekly digest generation + email
- [ ] Data ownership basics: export + delete + “we do not train” policy

---

## Post-MVP Roadmap (Short)

**Phase 1 – Automatic Memory**
- Browser extension for automatic capture  
- Multi-source imports (Claude, Perplexity, etc.)

**Phase 2 – Structured Intelligence**
- Auto themes + relationships  
- Time-based views: “this week, this quarter”  
- Project-level monthly summaries

**Phase 3 – Map / Field Visualization**
- Orbs for themes/branches  
- Density-based sizing  
- Timeline scrubber

**Phase 4 – Shared Spaces**
- Client/team workspaces  
- Shared summaries

**Phase 5 – Native Thinking**
- Native chat inside app  
- Voice/email/SMS ingestion
