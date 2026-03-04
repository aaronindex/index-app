-- Semantic overlay: LLM-generated labels keyed by state_hash (do not affect structural state)
-- scope_id: null for global, project uuid for project

CREATE TABLE IF NOT EXISTS public.semantic_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'project')),
  scope_id UUID NULL,
  object_type TEXT NOT NULL CHECK (object_type IN ('arc', 'pulse', 'direction')),
  object_id TEXT NOT NULL,
  state_hash TEXT NOT NULL,
  title TEXT NULL,
  body TEXT NULL,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  model TEXT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scope_type, scope_id, object_type, object_id, state_hash)
);

CREATE INDEX IF NOT EXISTS idx_semantic_labels_user_scope_state
  ON public.semantic_labels(user_id, scope_type, scope_id, state_hash);

CREATE INDEX IF NOT EXISTS idx_semantic_labels_object
  ON public.semantic_labels(object_type, object_id, state_hash);

ALTER TABLE public.semantic_labels ENABLE ROW LEVEL SECURITY;

-- Users can read their own labels (app uses session client for overlay lookup)
CREATE POLICY "Users can view their own semantic labels"
  ON public.semantic_labels FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates only via service role in admin generate route (bypasses RLS)
