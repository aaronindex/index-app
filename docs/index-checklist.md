# INDEX – MASTER BUILD CHECKLIST
Status: ACTIVE
Owner: Aaron
Purpose: Single source of truth for all build + infra tasks for Index.

Legend:
[ ] = Not started
[~] = In progress
[x] = Complete
[!] = Blocked

--------------------------------------------------
PHASE 0 — PERSONAL & INFRA SETUP
--------------------------------------------------

[ ] OpenAI API key created
[ ] OpenAI billing limit set

[ ] Supabase project created
[ ] Supabase region selected
[ ] pgvector extension enabled
[ ] Supabase anon key stored
[ ] Supabase service role key stored

[ ] Vercel account ready
[ ] GitHub repo created: index-app
[ ] Vercel + GitHub connected

[ ] Email provider chosen
[ ] Email API key created
[ ] From-domain configured (or sandbox)

[ ] Local dev:
    [ ] Node LTS installed
    [ ] pnpm / npm installed
    [ ] Fresh Next.js + TS app created
    [ ] Base packages installed

--------------------------------------------------
PHASE 1 — AUTH & DATABASE FOUNDATION
--------------------------------------------------

[ ] Supabase auth configured
[ ] profiles table created
[ ] profiles RLS policies added

[ ] imports table created
[ ] conversations table created
[ ] messages table created

[ ] message_chunks table created
[ ] message_chunk_embeddings table created

[ ] highlights table created
[ ] highlight_embeddings table created

[ ] branch_highlights table created

[ ] projects table created
[ ] project_conversations table created

[ ] weekly_digests table created
[ ] jobs table created

[ ] All RLS policies verified

--------------------------------------------------
PHASE 2 — IMPORT PIPELINE
--------------------------------------------------

[ ] File upload UI built
[ ] imports row created on upload
[ ] Import job enqueued

[ ] ChatGPT export parser built
[ ] conversations inserted correctly
[ ] messages inserted correctly

[ ] Chunking logic complete
[ ] message_chunks inserted
[ ] Embedding generation working
[ ] message_chunk_embeddings inserted

[ ] Import error handling
[ ] Import success summary UI

--------------------------------------------------
PHASE 3 — SEARCH ("ASK INDEX")
--------------------------------------------------

[ ] embedText helper built
[ ] Vector similarity query working

[ ] answerQuery helper built
[ ] Source citations returned

[ ] Ask Index UI built
[ ] Global search functional

--------------------------------------------------
PHASE 4 — PROJECT ORGANIZATION
--------------------------------------------------

[ ] Create project UI
[ ] Attach conversation to project
[ ] Project-scoped search

--------------------------------------------------
PHASE 5 — HIGHLIGHTS & BRANCHING
--------------------------------------------------

[ ] Text selection UI for highlights
[ ] Highlight creation persisted

[ ] Create branch from highlight
[ ] parent_conversation_id set correctly
[ ] origin_highlight_id set correctly

[ ] Branch conversation UI

--------------------------------------------------
PHASE 6 — WEEKLY DIGEST
--------------------------------------------------

[ ] Weekly job selector logic
[ ] Digest prompt finalized
[ ] weekly_digests rows created
[ ] Digest email template built
[ ] Digest email sending verified

--------------------------------------------------
PHASE 7 — TRUST & DATA OWNERSHIP
--------------------------------------------------

[ ] Export all data (JSON)
[ ] Delete account + data
[ ] Privacy policy written
[ ] “No training on your data” copy added

--------------------------------------------------
PHASE 8 — ALPHA ONBOARDING
--------------------------------------------------

[ ] Private onboarding instructions written
[ ] 3–5 alpha users invited
[ ] Feedback logging process created
