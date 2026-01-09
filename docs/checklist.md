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
[x] From-domain configured (DNS + DKIM) - Verified: hello@indexapp.co, all auth passing

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
[x] Background job queued (jobs table) - E1: Durable background jobs implemented

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
[x] Job status polling (every 3s while import screen open)
[x] Step-by-step progress display with counts
[x] Retry failed jobs

Quick Import (Paste One Conversation)

[x] Quick Import UI (paste one conversation)
[x] Role-aware transcript parser
[x] Quick Import → conversation/messages insert
[x] Quick Import chunk + embed pipeline
[x] Threshold: sync for small, background job for large
[x] Optional project assignment on import
[x] Deduplication check

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
[x] Project Library tab implemented (links + youtube + pdf/images)
[x] project_assets table + RLS
[x] project-assets storage bucket wired (see docs/storage-bucket-setup.md)
[x] Auto-title fetch for links/youtube
[x] Notes supported and displayed
[x] Thumbnail previews for links/youtube/images
[x] ViewAssetModal for viewing images/youtube directly in app

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
[x] Redactions table + UI tool added (selection → redact)
[x] Redaction tool available alongside highlight in text selection
[x] Redactions suppress content from resurfacing and Start Chat prompts

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
[x] Context compiler respects personal/inactive/redaction suppression rules
[x] Start Chat excludes inactive items and redacted content by default
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
[ ] DEPRECATED - Removed in favor of helping users maintain focus (goal of INDEX) instead of "exploring"
[ ] Clustered theme cards
[ ] Density-based sizing
[ ] Connection lines
[ ] Theme detail view

B4 — Status Layer Integration
[x] Priority / Open / Complete / Dormant UI affordances
[x] "What changed this week" (project-level activity summary)
[x] Personal project flag + filters (default business)
[x] Inactive item flag + filters (default active)
[x] Reducing valve rules applied to lists and sorting
[x] Filter pills for projects (Business/All/Personal)
[x] Filter pills for items (Active/All/Inactive)
[x] Toggle UI for marking items inactive
[x] Toggle UI for marking projects as personal (project header)
[x] Inactive items visually de-emphasized and sorted to bottom
[x] Personal badge displayed on project name when enabled

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
[x] Onboarding flow component with step-by-step guidance
[x] Empty state shows interactive onboarding (Welcome, Import, Projects, Ask Index, Digests)
[x] Enhanced partial empty state with next steps guidance
[x] Digest preview/explanation for new users (when no digest exists)
[x] Clear call-to-action to generate first digest
[ ] Auto-trigger insights extraction after first import (optional enhancement)

D2 — Guided Tour
[ ] 6-step intro flow (import → project → highlight → branch → Ask Index)
[ ] “Your first insight”

==================================================
PHASE E — PERFORMANCE & STABILITY
==================================================
E1 — Move imports to durable background jobs
[x] Step-by-step job processing (parse → insert_conversations → insert_messages → chunk_messages → embed_chunks → finalize)
[x] Job tracking fields added (attempt_count, locked_at, last_error, step, progress_json)
[x] Idempotency implemented (UPSERT for conversations, DELETE+INSERT for messages/chunks/embeddings)
[x] Rate limiting with exponential backoff for OpenAI API calls
[x] Cost safety measures (max chunks per run, batch size limits)
[x] Job status polling API (/api/imports/jobs)
[x] Vercel cron job configured (runs every minute via /api/jobs/process)
[x] Cron authentication (x-vercel-cron header + optional token)
[x] Quick import jobs supported (sync for small, async for large)
[x] Deduplication hash for preventing duplicate imports

E2 — Adaptive chunking strategy
E3 — Error notifications + logging
[x] Error notification component (toast system with error/success/info/warning)
[x] Error notification container in root layout (global notifications)
[x] Error handling utility with user-friendly messages
[x] API error wrapper with automatic error display
[x] React error boundary for component errors
[x] Enhanced error messages in key components (create project, toggle actions, highlights, redactions)
[x] Client-side error logging utility (ready for production error tracking service)

E4 — Hybrid search ranking (recency + relevance)
E5 — Micro-animations + UX polish
[x] Loading skeletons for better perceived performance
[x] Improved error handling with retry options
[x] Enhanced empty state messaging (differentiates between truly empty vs. no content yet)
[x] Renamed "Toolbelt" to "Tools" for clarity

==================================================
PHASE 8 — LAUNCH-READY POLISH
==================================================
A) Routing & Access Control
[x] Invite-code gate implemented (invite_codes table + parser + signup block)
[x] Landing page for logged-out users
[x] Auth routing redirects (/ → /home for authenticated)
[x] Invite code verification and usage tracking

B) Free-User Limits (Reducing Valve)
[x] Free-user limits enforced server-side (imports, ask, meaning objects, assets)
[x] Limit tracking fields added to profiles
[x] Limit hit toast messages in UI
[x] Limits reset after 24 hours

C) Landing Page
[x] LandingPage.tsx component created
[x] Hero section with copy from marketing narrative
[x] Screenshot section placeholder
[x] Trust row ("Your data is not used for training...")
[x] CTA: Sign In / Get Started button
[x] Ramp-style redesign: 2-column hero, value cards, feature sections
[x] MonitorScreenshotPanel component for screenshot display
[x] ValueCard component for reusable marketing cards
[x] Full-width sections with proper spacing and hierarchy

D) Onboarding (Alpha-Minimal)
[x] OnboardingSteps.tsx component created
[x] 6-step onboarding flow (import, project, highlight, task/decision, ask, digest)
[x] Completion state stored in localStorage
[x] Conditional rendering after first import

E) Analytics Markers
[x] GA4 dataLayer events added (landing_view, invite_code_used)
[x] Import events (import_start, import_complete)
[x] Ask Index events (ask_query)
[x] Start Chat events (start_chat_invoked)
[x] Meaning object events (highlight_created, task_created, decision_created)

F) UI Polish
[x] Nav bar background color with opacity (sticky header above content)
[x] Signed-out nav state (minimal: INDEX logo + Sign in button)
[x] Signed-in nav state (full navigation with mobile menu)

==================================================
PHASE F — MONETIZATION PREP
==================================================
F1 — Billing page
F2 — Subscription tiers
F3 — Soft paywall (import count)
F4 — Usage dashboard
F5 — Upgrade nudges

==================================================
PHASE 2.5 — ACTION ORGANIZATION & PLANNING LAYER
==================================================

Purpose:
Translate insight into forward motion without introducing branching,
recursive thinking, or task-manager bloat. This layer supports
*orientation and commitment*, not ideation.

Core Principles:
- Tasks and Decisions are the only forward-action objects.
- No new chat or branching surfaces are introduced.
- Planning is qualitative and horizon-based, not calendar-based.
- Business and Personal domains are strictly siloed.
- AI suggests structure; users retain final authority.

--------------------------------------------------
2.5.1 — Task Co-Creation (Signal → Action)
--------------------------------------------------

[ ] Auto-generate a small, weighted AI task list per import run
    - Source signals: highlights, Ask Index output, unresolved decisions
    - Limit output to 3–5 tasks maximum
    - Tasks must always be user-editable
    - Instrument: `task_list_generated`

[ ] Enable full task list mutation
    - Add / edit / delete
    - Reorder
    - Move between horizon buckets
    - Instrument: `task_item_mutated`

--------------------------------------------------
2.5.2 — Temporal Horizon Tags (Lightweight Planning)
--------------------------------------------------

Purpose:
Provide a sense of “when” without schedules, dates, or deadlines.

[ ] Add enum-only horizon tags to Tasks:
    - `this_week`
    - `this_month`
    - `later`
    - Instrument: `task_horizon_tagged`

[ ] Add enum-only horizon tags to Decisions:
    - `this_week`
    - `this_month`
    - `later`
    - Instrument: `decision_horizon_tagged`

Rules:
- One horizon tag per item
- No calendar integration
- Horizon affects grouping and surfacing only

--------------------------------------------------
2.5.3 — Pinned Notes (Orientation Anchors)
--------------------------------------------------

Purpose:
Allow minimal, user-authored grounding per container.

[ ] Allow one pinned note per:
    - Project (Business domain)
    - Theme (Personal domain)
    - Instrument: `bucket_note_pinned`

Rules:
- One note max per container
- Manual edits only
- No AI mutation
- Used for framing, not accumulation

--------------------------------------------------
2.5.4 — Domain Separation (Business vs Personal)
--------------------------------------------------

Rules:
- Business domain uses **Projects** as containers
- Personal domain uses **Themes** as containers
- No crossover of:
    - Tasks
    - Decisions
    - Search results
    - Start Chat context
    - Exports

[ ] Business dashboard shows project-level items only
[ ] Personal dashboard shows theme-level items only
    - Instrument: `domain_switched`, `dashboard_viewed`

--------------------------------------------------
2.5.5 — Dashboard Planning Views (Orientation Surfaces)
--------------------------------------------------

Purpose:
Provide a calm planning surface focused on “what matters next,”
not productivity metrics.

[ ] Business Dashboard
    - Tasks grouped by horizon (Week / Month / Later)
    - Qualitative progress per Project (no numeric precision)
    - Single “Minimum Next Action” headline
    - Instrument: `dashboard_project_progressed`, `next_action_viewed`

[ ] Personal Dashboard
    - Tasks grouped by horizon (Week / Month / Later)
    - Qualitative progress per Theme
    - Single “Minimum Next Action” headline
    - Instrument: `dashboard_theme_progressed`, `next_action_viewed`

--------------------------------------------------
2.5.6 — Exports & Continuity
--------------------------------------------------

[ ] Enable checklist.md export from:
    - Project Dashboard
    - Theme Dashboard
    - Task detail view

[ ] Ensure exports respect:
    - Redactions
    - Inactive / Dormant flags
    - Domain silo (Business or Personal only)

[ ] Export filename format:
    - `checklist-<timestamp>.md`
    - Instrument: `checklist_exported`

--------------------------------------------------
2.5.7 — Tools (System-Level Verbs Only)
--------------------------------------------------

Existing (Implemented):
[x] Weekly Digest generator
[x] Context Pack clipboard export
[x] External Start Chat from Task / Decision only
[x] Redactions suppress surfaced content and exports
[x] Inactive / Dormant flags

To Prototype (Evaluate or Discard):
[ ] Re-Orient — 1-line project/theme context rehydration
    - Instrument: `reorient_viewed`

[ ] Decision Log — scoped decision history with rationale
    - Instrument: `decision_log_viewed`

[ ] Start Chat intents (verbs only):
    - `Clarify` / `Shape` / `Fix` / `Challenge`
    - Must originate from Task or Decision
    - Must respect Redactions + Inactive flags
    - Instrument: `start_chat_invoked`


==================================================
DEPRECATED / REMOVED (Conceptual Corrections)
==================================================

[x] Branching model (replaced by thought-object model)
[x] Task Seeds (removed due to recursive ideation risk)
[x] Global Action List (superseded by dashboard-local views)
[x] Thread Explorer / Mini-Map visualization
[x] Theme Map visualization
[x] Micro-chat UI surfaces


