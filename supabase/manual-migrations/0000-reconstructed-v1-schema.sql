-- INDEX v1 Schema Reconstruction
-- This file recreates the complete v1 database schema for a fresh Supabase project
-- Generated from existing migrations and codebase analysis
-- DO NOT include v2 tables (arc, phase, pulse, snapshot_state)

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- BASE TABLES (Core Schema)
-- ============================================================================

-- Profiles (user profiles linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  weekly_digest_enabled BOOLEAN DEFAULT true,
  time_zone TEXT DEFAULT 'America/Denver',
  -- Billing fields (from add_billing_fields.sql)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_status TEXT CHECK (plan_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
  plan_updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Attribution fields (from add_billing_fields.sql)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  initial_referrer TEXT,
  initial_landing_path TEXT,
  initial_utm_captured_at TIMESTAMPTZ,
  -- User limits (from add_user_limits_to_profiles.sql)
  import_count_24h INT DEFAULT 0,
  ask_count_24h INT DEFAULT 0,
  meaning_objects_24h INT DEFAULT 0,
  limits_reset_at TIMESTAMPTZ DEFAULT NOW(),
  -- Lifecycle emails (from add_lifecycle_email_fields.sql)
  welcome_email_sent_at TIMESTAMPTZ,
  no_import_nudge_sent_at TIMESTAMPTZ,
  -- First project flag (from add_first_project_created_flag.sql)
  has_created_project BOOLEAN DEFAULT FALSE,
  -- Email send limit (from add_email_send_limit_tracking.sql)
  email_send_count_24h INT DEFAULT 0
);

-- Imports (file/ingest events)
CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  error_message TEXT,
  raw_file_path TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Job tracking fields (from add_job_tracking_fields.sql)
  dedupe_hash TEXT,
  progress_json JSONB NOT NULL DEFAULT '{}'
);

-- Projects (created before highlights/conversations to resolve FK dependencies)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Reducing valve (from add_reducing_valve_fields.sql)
  is_personal BOOLEAN NOT NULL DEFAULT false
);

-- Conversations (origin_highlight_id FK added later after highlights table exists)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  import_id UUID REFERENCES imports(id) ON DELETE SET NULL,
  title TEXT,
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  parent_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  origin_highlight_id UUID, -- FK added later
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Reducing valve (from add_reducing_valve_fields.sql)
  is_inactive BOOLEAN NOT NULL DEFAULT false
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  index_in_conversation INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Source fields (from add_message_source_fields.sql)
  source_message_id TEXT,
  raw_payload JSONB
);

-- Message Chunks (for vector search)
CREATE TABLE IF NOT EXISTS message_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Message Chunk Embeddings (pgvector)
CREATE TABLE IF NOT EXISTS message_chunk_embeddings (
  chunk_id UUID PRIMARY KEY REFERENCES message_chunks(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Highlights (source_ask_index_run_id FK added later after ask_index_runs table exists)
CREATE TABLE IF NOT EXISTS highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  start_offset INT,
  end_offset INT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ask Index tracking (from add_source_ask_index_run_id.sql) - FK added later
  source_ask_index_run_id UUID
);

-- Highlight Embeddings (pgvector)
CREATE TABLE IF NOT EXISTS highlight_embeddings (
  highlight_id UUID PRIMARY KEY REFERENCES highlights(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Branch Highlights (junction table)
CREATE TABLE IF NOT EXISTS branch_highlights (
  branch_conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  highlight_id UUID NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (branch_conversation_id, highlight_id)
);


-- Project Conversations (junction table)
CREATE TABLE IF NOT EXISTS project_conversations (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, conversation_id)
);

-- Weekly Digests
CREATE TABLE IF NOT EXISTS weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary TEXT,
  top_themes JSONB,
  open_loops JSONB,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Digest v2 fields (from add_digest_v2_fields.sql)
  what_changed JSONB,
  recommended_next_steps JSONB
);

-- Jobs (background work)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'error')),
  error_message TEXT,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Job tracking fields (from add_job_tracking_fields.sql)
  attempt_count INT NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  step TEXT NOT NULL DEFAULT 'queued' CHECK (step IN ('queued', 'parse', 'insert_conversations', 'insert_messages', 'chunk_messages', 'embed_chunks', 'finalize')),
  progress_json JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================================
-- MIGRATION-CREATED TABLES
-- ============================================================================

-- Tasks (from create_tasks_table.sql + additions)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'complete', 'cancelled', 'dormant', 'priority')),
  source_query TEXT,
  source_answer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Additional fields
  source_highlight_id UUID REFERENCES highlights(id) ON DELETE SET NULL,
  source_ask_index_run_id UUID, -- FK added later after ask_index_runs is created
  -- Pinning and sort (from add_pinning_and_sort_order.sql)
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER,
  -- Horizon (from add_horizon_to_tasks.sql)
  horizon TEXT CHECK (horizon IN ('this_week', 'this_month', 'later')),
  -- Reducing valve (from add_reducing_valve_fields.sql)
  is_inactive BOOLEAN NOT NULL DEFAULT false
);

-- Decisions (from create_decisions_table.sql + additions)
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Additional fields
  source_ask_index_run_id UUID, -- FK added later after ask_index_runs is created
  -- Pinning (from add_pinning_and_sort_order.sql)
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  -- Reducing valve (from add_reducing_valve_fields.sql)
  is_inactive BOOLEAN NOT NULL DEFAULT false
);

-- Ask Index Runs (from create_ask_index_runs_table.sql)
CREATE TABLE IF NOT EXISTS ask_index_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scope TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  query_hash TEXT NOT NULL,
  query_length INT NOT NULL,
  result_count INT NOT NULL,
  top_score DOUBLE PRECISION,
  threshold DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  latency_ms INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'no_results', 'error')),
  model TEXT
);

-- Start Chat Runs (from create_start_chat_runs_table.sql)
CREATE TABLE IF NOT EXISTS start_chat_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  origin_type TEXT NOT NULL CHECK (origin_type IN ('project', 'task', 'decision')),
  origin_id UUID,
  target_tool TEXT NOT NULL CHECK (target_tool IN ('chatgpt', 'claude', 'cursor', 'other')),
  intent TEXT,
  prompt_text TEXT NOT NULL,
  context_refs JSONB,
  status TEXT DEFAULT 'drafted' CHECK (status IN ('drafted', 'copied', 'harvested', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing Events (from add_billing_fields.sql)
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('subscription_activated', 'subscription_updated', 'subscription_canceled')),
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro')),
  price_id TEXT,
  stripe_event_id TEXT UNIQUE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite Codes (from create_invite_codes_table.sql)
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  max_uses INT NOT NULL DEFAULT 5,
  uses INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LP Waitlist (from create_lp_waitlist_table.sql)
CREATE TABLE IF NOT EXISTS lp_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'signed_out_lp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ
);

-- Project Assets (from create_project_assets_table.sql)
CREATE TABLE IF NOT EXISTS project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('link', 'youtube', 'file')),
  title TEXT NOT NULL,
  url TEXT,
  domain TEXT,
  note TEXT,
  storage_path TEXT,
  mime_type TEXT,
  file_size INT,
  width INT,
  height INT,
  thumbnail_url TEXT,
  is_inactive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT file_requires_storage CHECK (
    (type = 'file' AND storage_path IS NOT NULL AND mime_type IS NOT NULL) OR
    (type != 'file')
  ),
  CONSTRAINT link_requires_url CHECK (
    (type IN ('link', 'youtube') AND url IS NOT NULL) OR
    (type = 'file')
  )
);

-- Redactions (from create_redactions_table.sql)
CREATE TABLE IF NOT EXISTS redactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  message_chunk_id UUID REFERENCES message_chunks(id) ON DELETE SET NULL,
  selection_start INT,
  selection_end INT,
  redacted_text TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags (from create_tags_and_themes_tables.sql)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('entity', 'topic', 'person', 'project', 'technology', 'concept')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name, category)
);

-- Conversation Tags (junction table)
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  confidence DECIMAL(3, 2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, tag_id)
);

-- Themes (from create_tags_and_themes_tables.sql)
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight DECIMAL(3, 2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Theme Conversations (junction table)
CREATE TABLE IF NOT EXISTS theme_conversations (
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3, 2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (theme_id, conversation_id)
);

-- ============================================================================
-- ADD DEFERRED FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add origin_highlight_id FK to conversations (deferred due to circular dependency)
ALTER TABLE conversations
ADD CONSTRAINT fk_conversations_origin_highlight_id 
FOREIGN KEY (origin_highlight_id) REFERENCES highlights(id) ON DELETE SET NULL;

-- Add source_ask_index_run_id FK to highlights (deferred - added after all tables are created)
-- This will be added at the end after ask_index_runs table exists

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_limits_reset ON profiles(limits_reset_at);
CREATE INDEX IF NOT EXISTS idx_profiles_lifecycle_emails ON profiles(welcome_email_sent_at, no_import_nudge_sent_at, created_at) WHERE welcome_email_sent_at IS NOT NULL AND no_import_nudge_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_has_created_project ON profiles(has_created_project) WHERE has_created_project = FALSE;

-- Imports indexes
CREATE INDEX IF NOT EXISTS idx_imports_user_id ON imports(user_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status);
CREATE INDEX IF NOT EXISTS idx_imports_dedupe_hash ON imports(user_id, dedupe_hash) WHERE dedupe_hash IS NOT NULL;

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_import_id ON conversations(import_id);
CREATE INDEX IF NOT EXISTS idx_conversations_parent_id ON conversations(parent_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_is_inactive ON conversations(user_id, is_inactive);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_index ON messages(conversation_id, index_in_conversation);
CREATE INDEX IF NOT EXISTS idx_messages_source_message_id ON messages(conversation_id, source_message_id) WHERE source_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_source ON messages(conversation_id, source_message_id) WHERE source_message_id IS NOT NULL;

-- Message Chunks indexes
CREATE INDEX IF NOT EXISTS idx_message_chunks_user_id ON message_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_message_chunks_conversation_id ON message_chunks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_chunks_message_id ON message_chunks(message_id);

-- Message Chunk Embeddings indexes (vector index)
CREATE INDEX IF NOT EXISTS idx_message_chunk_embeddings_chunk_id ON message_chunk_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Highlights indexes
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_conversation_id ON highlights(conversation_id);
CREATE INDEX IF NOT EXISTS idx_highlights_message_id ON highlights(message_id);
CREATE INDEX IF NOT EXISTS idx_highlights_source_ask_index_run_id ON highlights(source_ask_index_run_id);

-- Highlight Embeddings indexes (vector index)
CREATE INDEX IF NOT EXISTS idx_highlight_embeddings_highlight_id ON highlight_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_personal ON projects(user_id, is_personal);

-- Project Conversations indexes
CREATE INDEX IF NOT EXISTS idx_project_conversations_project_id ON project_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_conversations_conversation_id ON project_conversations(conversation_id);

-- Weekly Digests indexes
CREATE INDEX IF NOT EXISTS idx_weekly_digests_user_id ON weekly_digests(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_week ON weekly_digests(user_id, week_start, week_end);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_step_created ON jobs(status, step, created_at) WHERE status = 'pending' AND step = 'queued';
CREATE INDEX IF NOT EXISTS idx_jobs_locked_at ON jobs(locked_at) WHERE locked_at IS NOT NULL;

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_source_highlight_id ON tasks(source_highlight_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_ask_index_run_id ON tasks(source_ask_index_run_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_pinned ON tasks(project_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_tasks_project_sort ON tasks(project_id, sort_order) WHERE sort_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_horizon ON tasks(horizon) WHERE horizon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_is_inactive ON tasks(user_id, is_inactive);

-- Decisions indexes
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_conversation_id ON decisions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_decisions_source_ask_index_run_id ON decisions(source_ask_index_run_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project_pinned ON decisions(project_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_decisions_is_inactive ON decisions(user_id, is_inactive);

-- Ask Index Runs indexes
CREATE INDEX IF NOT EXISTS idx_ask_index_runs_user_id ON ask_index_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_ask_index_runs_created_at ON ask_index_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_ask_index_runs_query_hash ON ask_index_runs(query_hash);

-- Start Chat Runs indexes
CREATE INDEX IF NOT EXISTS idx_start_chat_runs_user_id ON start_chat_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_start_chat_runs_project_id ON start_chat_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_start_chat_runs_origin ON start_chat_runs(origin_type, origin_id);
CREATE INDEX IF NOT EXISTS idx_start_chat_runs_status ON start_chat_runs(status);

-- Billing Events indexes
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);

-- Invite Codes indexes
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = true;

-- LP Waitlist indexes
CREATE INDEX IF NOT EXISTS idx_lp_waitlist_email ON lp_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_lp_waitlist_source ON lp_waitlist(source);

-- Project Assets indexes
CREATE INDEX IF NOT EXISTS idx_project_assets_project_created ON project_assets(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_assets_project_inactive_created ON project_assets(project_id, is_inactive, created_at DESC);

-- Redactions indexes
CREATE INDEX IF NOT EXISTS idx_redactions_user_id ON redactions(user_id);
CREATE INDEX IF NOT EXISTS idx_redactions_project_id ON redactions(project_id);
CREATE INDEX IF NOT EXISTS idx_redactions_conversation_id ON redactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_redactions_message_id ON redactions(message_id);
CREATE INDEX IF NOT EXISTS idx_redactions_message_chunk_id ON redactions(message_chunk_id);

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag_id ON conversation_tags(tag_id);

-- Themes indexes
CREATE INDEX IF NOT EXISTS idx_themes_user_id ON themes(user_id);
CREATE INDEX IF NOT EXISTS idx_theme_conversations_theme_id ON theme_conversations(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_conversations_conversation_id ON theme_conversations(conversation_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables that need it
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_start_chat_runs_updated_at BEFORE UPDATE ON start_chat_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON themes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update project_assets updated_at
CREATE OR REPLACE FUNCTION update_project_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_assets_updated_at BEFORE UPDATE ON project_assets FOR EACH ROW EXECUTE FUNCTION update_project_assets_updated_at();

-- Function to create profile on user signup (from create_profile_trigger.sql + fix_trial_profiles_comprehensive.sql)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, plan, weekly_digest_enabled, time_zone)
  VALUES (
    NEW.id,
    'free',
    true,
    'America/Denver'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Vector similarity search function (from create_match_chunks_function.sql)
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  user_id uuid,
  project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  content text,
  conversation_id uuid,
  conversation_title text,
  message_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id as chunk_id,
    mc.content,
    mc.conversation_id,
    c.title as conversation_title,
    mc.message_id,
    1 - (mce.embedding <=> query_embedding) as similarity
  FROM message_chunk_embeddings mce
  JOIN message_chunks mc ON mce.chunk_id = mc.id
  JOIN conversations c ON mc.conversation_id = c.id
  WHERE mc.user_id = match_chunks.user_id
    AND (1 - (mce.embedding <=> query_embedding)) >= match_threshold
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM project_conversations pc
        WHERE pc.conversation_id = mc.conversation_id
        AND pc.project_id = match_chunks.project_id
      )
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_chunk_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_index_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE start_chat_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lp_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE redactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_conversations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Imports policies
CREATE POLICY "Users can view their own imports" ON imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own imports" ON imports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own imports" ON imports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own imports" ON imports FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "Users can view their own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations" ON conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can create messages in their conversations" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can update messages in their conversations" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can delete messages in their conversations" ON messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);

-- Message Chunks policies
CREATE POLICY "Users can view their own message chunks" ON message_chunks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own message chunks" ON message_chunks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own message chunks" ON message_chunks FOR DELETE USING (auth.uid() = user_id);

-- Message Chunk Embeddings policies
CREATE POLICY "Users can view their own embeddings" ON message_chunk_embeddings FOR SELECT USING (
  EXISTS (SELECT 1 FROM message_chunks WHERE message_chunks.id = message_chunk_embeddings.chunk_id AND message_chunks.user_id = auth.uid())
);
CREATE POLICY "Users can create their own embeddings" ON message_chunk_embeddings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM message_chunks WHERE message_chunks.id = message_chunk_embeddings.chunk_id AND message_chunks.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own embeddings" ON message_chunk_embeddings FOR DELETE USING (
  EXISTS (SELECT 1 FROM message_chunks WHERE message_chunks.id = message_chunk_embeddings.chunk_id AND message_chunks.user_id = auth.uid())
);

-- Highlights policies
CREATE POLICY "Users can view their own highlights" ON highlights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own highlights" ON highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own highlights" ON highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own highlights" ON highlights FOR DELETE USING (auth.uid() = user_id);

-- Highlight Embeddings policies
CREATE POLICY "Users can view their own highlight embeddings" ON highlight_embeddings FOR SELECT USING (
  EXISTS (SELECT 1 FROM highlights WHERE highlights.id = highlight_embeddings.highlight_id AND highlights.user_id = auth.uid())
);
CREATE POLICY "Users can create their own highlight embeddings" ON highlight_embeddings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM highlights WHERE highlights.id = highlight_embeddings.highlight_id AND highlights.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own highlight embeddings" ON highlight_embeddings FOR DELETE USING (
  EXISTS (SELECT 1 FROM highlights WHERE highlights.id = highlight_embeddings.highlight_id AND highlights.user_id = auth.uid())
);

-- Branch Highlights policies
CREATE POLICY "Users can view their own branch highlights" ON branch_highlights FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = branch_highlights.branch_conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can create their own branch highlights" ON branch_highlights FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = branch_highlights.branch_conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own branch highlights" ON branch_highlights FOR DELETE USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = branch_highlights.branch_conversation_id AND conversations.user_id = auth.uid())
);

-- Projects policies
CREATE POLICY "Users can view their own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Project Conversations policies
CREATE POLICY "Users can view their own project conversations" ON project_conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_conversations.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can create their own project conversations" ON project_conversations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_conversations.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own project conversations" ON project_conversations FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = project_conversations.project_id AND projects.user_id = auth.uid())
);

-- Weekly Digests policies
CREATE POLICY "Users can view their own weekly digests" ON weekly_digests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own weekly digests" ON weekly_digests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own weekly digests" ON weekly_digests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own weekly digests" ON weekly_digests FOR DELETE USING (auth.uid() = user_id);

-- Jobs policies
CREATE POLICY "Users can view their own jobs" ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own jobs" ON jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own jobs" ON jobs FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Decisions policies
CREATE POLICY "Users can view their own decisions" ON decisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own decisions" ON decisions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own decisions" ON decisions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own decisions" ON decisions FOR DELETE USING (auth.uid() = user_id);

-- Ask Index Runs policies
CREATE POLICY "Users can view their own ask_index_runs" ON ask_index_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ask_index_runs" ON ask_index_runs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Start Chat Runs policies
CREATE POLICY "Users can view their own start chat runs" ON start_chat_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own start chat runs" ON start_chat_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own start chat runs" ON start_chat_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own start chat runs" ON start_chat_runs FOR DELETE USING (auth.uid() = user_id);

-- Billing Events policies
CREATE POLICY "Users can view their own billing events" ON billing_events FOR SELECT USING (auth.uid() = user_id);

-- Invite Codes policies
CREATE POLICY "Public can verify invite codes" ON invite_codes FOR SELECT USING (true);

-- LP Waitlist policies
CREATE POLICY "Allow anonymous insert for waitlist signup" ON lp_waitlist FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Block all client selects" ON lp_waitlist FOR SELECT TO anon USING (false);
CREATE POLICY "Block all client updates" ON lp_waitlist FOR UPDATE TO anon USING (false);
CREATE POLICY "Block all client deletes" ON lp_waitlist FOR DELETE TO anon USING (false);

-- Project Assets policies
CREATE POLICY "Users can view their own assets" ON project_assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own assets" ON project_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assets" ON project_assets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assets" ON project_assets FOR DELETE USING (auth.uid() = user_id);

-- Redactions policies
CREATE POLICY "Users can view their own redactions" ON redactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own redactions" ON redactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own redactions" ON redactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own redactions" ON redactions FOR DELETE USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view their own tags" ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tags" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON tags FOR DELETE USING (auth.uid() = user_id);

-- Conversation Tags policies
CREATE POLICY "Users can view their own conversation_tags" ON conversation_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = conversation_tags.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can create their own conversation_tags" ON conversation_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = conversation_tags.conversation_id AND conversations.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own conversation_tags" ON conversation_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = conversation_tags.conversation_id AND conversations.user_id = auth.uid())
);

-- Themes policies
CREATE POLICY "Users can view their own themes" ON themes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own themes" ON themes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own themes" ON themes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own themes" ON themes FOR DELETE USING (auth.uid() = user_id);

-- Theme Conversations policies
CREATE POLICY "Users can view their own theme_conversations" ON theme_conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM themes WHERE themes.id = theme_conversations.theme_id AND themes.user_id = auth.uid())
);
CREATE POLICY "Users can create their own theme_conversations" ON theme_conversations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM themes WHERE themes.id = theme_conversations.theme_id AND themes.user_id = auth.uid())
);
CREATE POLICY "Users can delete their own theme_conversations" ON theme_conversations FOR DELETE USING (
  EXISTS (SELECT 1 FROM themes WHERE themes.id = theme_conversations.theme_id AND themes.user_id = auth.uid())
);

-- ============================================================================
-- FINAL DEFERRED FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- These are added at the end after all tables are created

-- Add source_ask_index_run_id FK to highlights (now that ask_index_runs exists)
ALTER TABLE highlights
ADD CONSTRAINT fk_highlights_source_ask_index_run_id
FOREIGN KEY (source_ask_index_run_id) REFERENCES ask_index_runs(id) ON DELETE SET NULL;

-- Add source_ask_index_run_id FK to tasks (now that ask_index_runs exists)
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_source_ask_index_run_id
FOREIGN KEY (source_ask_index_run_id) REFERENCES ask_index_runs(id) ON DELETE SET NULL;

-- Add source_ask_index_run_id FK to decisions (now that ask_index_runs exists)
ALTER TABLE decisions
ADD CONSTRAINT fk_decisions_source_ask_index_run_id
FOREIGN KEY (source_ask_index_run_id) REFERENCES ask_index_runs(id) ON DELETE SET NULL;
