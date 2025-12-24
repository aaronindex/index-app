--------------------------------------------------
PHASE 0 — PERSONAL & INFRA SETUP
--------------------------------------------------
OpenAI

[x] OpenAI API key created
[x] OpenAI billing limit set

Supabase

[x] Supabase project created
[x] Supabase region selected
[x] pgvector extension enabled
[x] Supabase anon key stored
[x] Supabase service role key stored

Vercel + GitHub + Domain

[x] Vercel account ready
[x] GitHub repo created: index-app
[x] Vercel + GitHub connected
[x] Domain purchased (indexapp.co)
[x] Workspace email created (aaron@indexapp.co)

Email Provider

[x] Resend account created
[x] Resend API key stored
[ ] From-domain configured (DNS + DKIM)

Local Dev

[x] Node LTS installed
[x] npm installed
[x] Repo cloned locally
[x] Fresh Next.js + TS app scaffolded
[x] Base packages installed (supabase-js, etc.)
[x] .env.local created with Supabase + OpenAI keys

--------------------------------------------------
PHASE 1 — AUTH & DATABASE FOUNDATION
--------------------------------------------------
Schema

[x] profiles table created
[x] imports table created
[x] projects table created
[x] conversations table created
[x] messages table created
[x] message_chunks table created
[x] message_chunk_embeddings table created
[x] highlights table created
[x] highlight_embeddings table created
[x] branch_highlights table created (deprecated - no longer used in branchless model)
[x] project_conversations table created
[x] decisions table created
[x] weekly_digests table created
[x] jobs table created

RLS Policies

[x] profiles RLS added
[x] imports RLS added
[x] projects RLS added
[x] conversations RLS added
[x] messages RLS added
[x] message_chunks RLS added
[x] message_chunk_embeddings RLS added
[x] highlights RLS added
[x] highlight_embeddings RLS added
[x] branch_highlights RLS added (deprecated - no longer used in branchless model)
[x] project_conversations RLS added
[x] decisions RLS added
[x] weekly_digests RLS added
[x] jobs RLS added
[x] tasks table created
[x] tasks RLS added
[x] start_chat_runs table created
[x] start_chat_runs RLS added

Auth

[x] Supabase Auth wiring in Next.js
[x] Automatic profile creation on new user
[x] Protected routes scaffolded

--------------------------------------------------
PHASE 2 — IMPORT PIPELINE
--------------------------------------------------
UI Flow

[x] File upload UI built
[x] Import record created on upload
[ ] Background job queued (jobs table) - Currently processing synchronously

Parser + Storage

[x] OpenAI/ChatGPT export parser built
[x] Conversations inserted
[x] Messages inserted

Chunking + Embeddings

[x] Chunking logic implemented
[x] message_chunks inserted
[x] Embeddings generated (OpenAI)
[x] message_chunk_embeddings inserted

UX Feedback

[x] Import progress UI (basic)
[x] Import error handling
[x] Import success summary

--------------------------------------------------
PHASE 3 — SEARCH ("ASK INDEX")
--------------------------------------------------

[x] embedText() helper built
[x] Vector similarity SQL working (RPC function + fallback)
[ ] Query→Answer helper created (future: LLM-based answer generation)
[x] Source citations returned
[x] Ask Index UI
[x] Global search functional

--------------------------------------------------
PHASE 4 — PROJECT ORGANIZATION
--------------------------------------------------

[x] Create Project UI
[x] Attach conversation to project UI (import-time + post-import assignment)
[x] Project-scoped search

--------------------------------------------------
PHASE 5 — HIGHLIGHTS & THOUGHT OBJECTS
--------------------------------------------------

[x] Text selection → highlight UI
[x] Highlight persisted
[x] Create task from highlight
[x] Create task from Ask Index follow-up
[x] Create decision from Ask Index follow-up
[x] Create decision manually (UI button in Decisions tab)
[x] Create highlight from Ask Index follow-up
[x] Tasks/Decisions link back to projects and source conversations/highlights
[x] Tasks support source_highlight_id for tracking origin
[x] Decisions support project_id for direct project linking

--------------------------------------------------
PHASE 5.5 — ROUND-TRIP CHAT INITIATION (CONTEXT → EXPLORATION)
--------------------------------------------------

[x] Continuity Packet compiler (deterministic, weighted context)
[x] Project-level "Resume Deliberate Thinking" with Intent selection
[x] Task-level "Start Chat" (Resolve/Plan/Debug)
[x] Decision-level "Start Chat" (Stress-test / Re-evaluate) with project context (tasks, decisions, highlights, conversations)
[x] Intent dropdown for project Start Chat (6 predefined + custom)
[x] start_chat_runs table for lifecycle tracking (drafted → copied → harvested/abandoned)
[x] Clipboard copy of generated context
[x] Buttons: Open in ChatGPT / Claude / Cursor
[x] Destination links tested (new-tab behavior)
[x] Start Chat removed from Highlights, Conversations, Ask Index results
[x] Start Chat on Ask Index follow-ups requires conversion to Task/Decision first
[x] Harvest/Abandon status tracking
[ ] Post-MVP hooks documented (deep links, AI-refined context) - Future enhancement


--------------------------------------------------
PHASE 6 — WEEKLY DIGEST
--------------------------------------------------

[x] Digest generation function (LLM-powered)
[x] Digest prompt finalized
[x] weekly_digests row created
[x] Digest email template built (Resend)
[x] Digest email sending confirmed
[x] Digest UI (list + detail views)
[x] Digest generation in Tools (renamed from Toolbelt)
[ ] Digest cron/weekly job selector (manual generation for MVP)

--------------------------------------------------
PHASE 7 — TRUST & DATA OWNERSHIP
--------------------------------------------------

[x] Export all data (JSON)
[x] Delete account + cascade
[x] Privacy policy written
[x] "No training on your data" copy added

--------------------------------------------------
PHASE 8 — ALPHA ONBOARDING
--------------------------------------------------

[x] Private onboarding instructions written
[ ] 3–5 alpha users invited (manual process)
[x] Feedback loop created (in-app feedback form + email)


==================================================
PHASE A — THE MAGIC LAYER (TRANSFORMATIVE AI)
==================================================
A1 — Ask Index: True LLM Answers
[x] Retrieve top chunks → LLM synthesis
[x] Structured answer block
[x] Inline citations
[x] "Related highlights / threads / projects"
[x] LLM-generated follow-up questions created per answer
[x] Follow-up questions displayed in Ask Index UI
[x] Actions to convert follow-ups into Task / Decision / Highlight
[x] Start Chat on follow-ups requires conversion to Task/Decision first (not direct)
[x] New objects linked back to originating query / project

A2 — Auto-Tagging + Theme Mapping
[x] Auto semantic tagger (LLM)
[x] Extract entities, topics, people, projects
[x] Auto-suggest project assignments (via tags during import)
[x] Auto-generated themes (API + UI button)
[x] Conversation → theme clustering (vectors)
[x] Tags auto-generated on import (internal signal layer only)
[x] Themes generation API available (for future automation)
[x] Tags/Themes hidden from UI (reductive v0 approach - internal use only)

A3 — Insight Extraction (AI Highlights)
[x] LLM-generated highlights
[x] Suggested insights / open loops
[x] Commitment + blocker extraction
[x] Decision detection

A4 — Branch Autocomplete
[ ] DEPRECATED - Branching removed in favor of thought-object model (Tasks/Decisions/Highlights)
[ ] Future: LLM-suggested follow-up prompts for Tasks/Decisions
[ ] Future: Reflection questions for Decisions
[ ] Future: Reframes / alternative angles for Tasks

A5 — Weekly Digest v2 (Narrative Intelligence)
[x] Multi-section narrative structure
[x] What changed? section with activity counts and narrative
[x] Open loops surfaced with priority levels
[x] Recommended next steps with priorities
[x] Enhanced digest UI with new sections

==================================================
PHASE B — UX MAGIC & VISUALIZATION
==================================================
B1 — Magic Home Screen
[x] Priority items (tasks, decisions)
[x] Latest insights (highlights)
[x] "Things to revisit" (older conversations with highlights)
[x] Quick commands (Ask Index, Toolbelt)
[x] Digest preview

B2 — Thread Explorer (Mini-Map)
[ ] DEPRECATED - Branching removed in favor of thought-object model
[ ] Future: Visual thought-object network (Tasks/Decisions/Highlights connections)
[ ] Future: Project-level relationship visualization

B3 — Theme Map ("The Field" v1)
[ ] Clustered theme cards
[ ] Density-based sizing
[ ] Connection lines
[ ] Theme detail view

B4 — Status Layer Integration
[x] Priority / Open / Complete / Dormant UI affordances
[x] "What changed this week" (project-level activity summary)
[ ] Filters + nudges

==================================================
PHASE C — ROUND-TRIP LOOPS (INTELLIGENT ACTION)
==================================================
C1 — Smart Suggested Chats
[ ] Pattern detection for unclear / unresolved threads
[ ] “Do you want to explore this further?” triggers

C2 — AI-Generated Context Packs
[ ] LLM-enhanced context blocks
[ ] Missing context inference
[ ] Exploration directions

C3 — Optional In-INDEX Micro-Chat (Post-Traction)
[ ] Lightweight inline question box
[ ] One-shot LLM responses
[ ] No thread persistence

==================================================
PHASE D — ONBOARDING MAGIC
==================================================
D1 — Frictionless First Run
[ ] Ask user to import ChatGPT export
[ ] Auto-generated insights
[ ] Auto themes
[ ] Digest preview

D2 — Guided Tour
[ ] 6-step intro flow (import → project → highlight → branch → Ask Index)
[ ] “Your first insight”

==================================================
PHASE E — PERFORMANCE & STABILITY
==================================================
E1 — Move imports to full background jobs
E2 — Adaptive chunking strategy
E3 — Error notifications + logging
E4 — Hybrid search ranking (recency + relevance)
E5 — Micro-animations + UX polish
[x] Loading skeletons for better perceived performance
[x] Improved error handling with retry options
[x] Enhanced empty state messaging (differentiates between truly empty vs. no content yet)
[x] Renamed "Toolbelt" to "Tools" for clarity

==================================================
PHASE F — MONETIZATION PREP
==================================================
F1 — Billing page
F2 — Subscription tiers
F3 — Soft paywall (import count)
F4 — Usage dashboard
F5 — Upgrade nudges