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
[x] branch_highlights table created
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
[x] branch_highlights RLS added
[x] project_conversations RLS added
[x] decisions RLS added
[x] weekly_digests RLS added
[x] jobs RLS added

Auth

[ ] Supabase Auth wiring in Next.js
[ ] Automatic profile creation on new user
[ ] Protected routes scaffolded

--------------------------------------------------
PHASE 2 — IMPORT PIPELINE
--------------------------------------------------
UI Flow

[ ] File upload UI built
[ ] Import record created on upload
[ ] Background job queued (jobs table)

Parser + Storage

[ ] OpenAI/ChatGPT export parser built
[ ] Conversations inserted
[ ] Messages inserted

Chunking + Embeddings

[ ] Chunking logic implemented
[ ] message_chunks inserted
[ ] Embeddings generated (OpenAI)
[ ] message_chunk_embeddings inserted

UX Feedback

[ ] Import progress UI
[ ] Import error handling
[ ] Import success summary

--------------------------------------------------
PHASE 3 — SEARCH ("ASK INDEX")
--------------------------------------------------

[ ] embedText() helper built
[ ] Vector similarity SQL working
[ ] Query→Answer helper created
[ ] Source citations returned
[ ] Ask Index UI
[ ] Global search functional

--------------------------------------------------
PHASE 4 — PROJECT ORGANIZATION
--------------------------------------------------

[ ] Create Project UI
[ ] Attach conversation to project UI
[ ] Project-scoped search

--------------------------------------------------
PHASE 5 — HIGHLIGHTS & BRANCHING
--------------------------------------------------

[ ] Text selection → highlight UI
[ ] Highlight persisted
[ ] Create branch from highlight
[ ] parent_conversation_id stored
[ ] origin_highlight_id stored
[ ] Branch conversation UI

--------------------------------------------------
PHASE 6 — WEEKLY DIGEST
--------------------------------------------------

[ ] Digest cron/weekly job selector
[ ] Digest prompt finalized
[ ] weekly_digests row created
[ ] Digest email template built (Resend)
[ ] Digest email sending confirmed

--------------------------------------------------
PHASE 7 — TRUST & DATA OWNERSHIP
--------------------------------------------------

[ ] Export all data (JSON)
[ ] Delete account + cascade
[ ] Privacy policy written
[ ] “No training on your data” copy added

--------------------------------------------------
PHASE 8 — ALPHA ONBOARDING
--------------------------------------------------

[ ] Private onboarding instructions written
[ ] 3–5 alpha users invited
[ ] Feedback loop created