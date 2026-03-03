-- INDEX v2 Project Outcome Table
-- Immutable, user-authored outcomes (results) per project

-- ============================================================================
-- PROJECT_OUTCOME TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_outcome (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_outcome_text_length CHECK (char_length(text) <= 140),
  CONSTRAINT project_outcome_single_line CHECK (text !~ E'[\\n\\r]')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_outcome_user_project_occurred
  ON public.project_outcome(user_id, project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_outcome_user_occurred
  ON public.project_outcome(user_id, occurred_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (immutable ledger)
-- ============================================================================

ALTER TABLE public.project_outcome ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own project outcomes" ON public.project_outcome;
DROP POLICY IF EXISTS "Users can create their own project outcomes" ON public.project_outcome;
DROP POLICY IF EXISTS "Users cannot update project outcomes" ON public.project_outcome;
DROP POLICY IF EXISTS "Users cannot delete project outcomes" ON public.project_outcome;

-- SELECT: users can view their own outcomes
CREATE POLICY "Users can view their own project outcomes"
  ON public.project_outcome FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: users can create outcomes only for themselves
CREATE POLICY "Users can create their own project outcomes"
  ON public.project_outcome FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Explicitly deny UPDATE and DELETE by omitting policies for those commands.
-- RLS defaults to deny when no matching policy exists.

