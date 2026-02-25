-- INDEX v2 Structural Schema Migration
-- Creates first-class structural objects: arc, phase, pulse, snapshot_state, arc_project_link, tension_edge
-- Follows v2 architecture overlay with user-scoped ownership

-- ============================================================================
-- ARCS
-- ============================================================================

CREATE TABLE IF NOT EXISTS arc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'compressed')),
  scope TEXT DEFAULT 'personal' CHECK (scope IN ('personal', 'project_spanning')),
  confidence_score NUMERIC,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signal_at TIMESTAMPTZ
);

-- Indexes for arc
CREATE INDEX IF NOT EXISTS idx_arc_user_id ON arc(user_id);
CREATE INDEX IF NOT EXISTS idx_arc_user_status_signal ON arc(user_id, status, last_signal_at DESC);

-- ============================================================================
-- ARC ↔ PROJECT LINK
-- ============================================================================

CREATE TABLE IF NOT EXISTS arc_project_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id UUID NOT NULL REFERENCES arc(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  link_strength NUMERIC,
  first_linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for arc_project_link
CREATE INDEX IF NOT EXISTS idx_arc_project_link_arc_id ON arc_project_link(arc_id);
CREATE INDEX IF NOT EXISTS idx_arc_project_link_project_id ON arc_project_link(project_id);

-- ============================================================================
-- PHASE
-- ============================================================================
-- Phase ownership derives from arc.user_id (NO user_id column)

CREATE TABLE IF NOT EXISTS phase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id UUID NOT NULL REFERENCES arc(id) ON DELETE CASCADE,
  phase_index INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dormant')),
  summary TEXT,
  confidence_score NUMERIC,
  started_at TIMESTAMPTZ,
  last_signal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for phase
CREATE INDEX IF NOT EXISTS idx_phase_arc_id ON phase(arc_id);
CREATE INDEX IF NOT EXISTS idx_phase_arc_index ON phase(arc_id, phase_index);

-- ============================================================================
-- PULSE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pulse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('project', 'global')),
  pulse_type TEXT NOT NULL CHECK (pulse_type IN ('tension', 'arc_shift', 'structural_threshold')),
  headline TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state_hash TEXT NOT NULL
);

-- Indexes for pulse
CREATE INDEX IF NOT EXISTS idx_pulse_user_id ON pulse(user_id);
CREATE INDEX IF NOT EXISTS idx_pulse_user_scope_occurred ON pulse(user_id, scope, occurred_at DESC);

-- ============================================================================
-- SNAPSHOT STATE
-- ============================================================================

CREATE TABLE IF NOT EXISTS snapshot_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('project', 'global')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  state_hash TEXT NOT NULL,
  snapshot_text TEXT,
  field_note_text TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for snapshot_state
CREATE INDEX IF NOT EXISTS idx_snapshot_state_user_id ON snapshot_state(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_state_user_scope_generated ON snapshot_state(user_id, scope, generated_at DESC);

-- ============================================================================
-- OPTIONAL: TENSION EDGE (internal, not surfaced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tension_edge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_a UUID NOT NULL REFERENCES arc(id) ON DELETE CASCADE,
  arc_b UUID NOT NULL REFERENCES arc(id) ON DELETE CASCADE,
  friction_score NUMERIC,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent self-referential edges
  CONSTRAINT tension_edge_no_self_reference CHECK (arc_a != arc_b)
);

-- Indexes for tension_edge
CREATE INDEX IF NOT EXISTS idx_tension_edge_arc_a ON tension_edge(arc_a);
CREATE INDEX IF NOT EXISTS idx_tension_edge_arc_b ON tension_edge(arc_b);
CREATE INDEX IF NOT EXISTS idx_tension_edge_arcs ON tension_edge(arc_a, arc_b);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp (reuse existing if present)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to arc
CREATE TRIGGER update_arc_updated_at
  BEFORE UPDATE ON arc
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_linked_at for arc_project_link
CREATE OR REPLACE FUNCTION update_arc_project_link_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_linked_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_arc_project_link_last_linked_at
  BEFORE UPDATE ON arc_project_link
  FOR EACH ROW
  EXECUTE FUNCTION update_arc_project_link_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE arc ENABLE ROW LEVEL SECURITY;
ALTER TABLE arc_project_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tension_edge ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: ARC
-- ============================================================================
-- Direct user_id ownership

CREATE POLICY "Users can view their own arcs"
  ON arc FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own arcs"
  ON arc FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own arcs"
  ON arc FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own arcs"
  ON arc FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: ARC_PROJECT_LINK
-- ============================================================================
-- Ownership derives from arc.user_id

CREATE POLICY "Users can view arc_project_links for their arcs"
  ON arc_project_link FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = arc_project_link.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create arc_project_links for their arcs"
  ON arc_project_link FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = arc_project_link.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update arc_project_links for their arcs"
  ON arc_project_link FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = arc_project_link.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete arc_project_links for their arcs"
  ON arc_project_link FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = arc_project_link.arc_id
      AND arc.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: PHASE
-- ============================================================================
-- Ownership derives from phase.arc_id → arc.user_id (NO direct user_id)

CREATE POLICY "Users can view phases for their arcs"
  ON phase FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = phase.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create phases for their arcs"
  ON phase FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = phase.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update phases for their arcs"
  ON phase FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = phase.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete phases for their arcs"
  ON phase FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = phase.arc_id
      AND arc.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: PULSE
-- ============================================================================
-- Direct user_id ownership

CREATE POLICY "Users can view their own pulses"
  ON pulse FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pulses"
  ON pulse FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pulses"
  ON pulse FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pulses"
  ON pulse FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: SNAPSHOT_STATE
-- ============================================================================
-- Direct user_id ownership (snapshot_state writes do NOT require service role)

CREATE POLICY "Users can view their own snapshot_states"
  ON snapshot_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own snapshot_states"
  ON snapshot_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own snapshot_states"
  ON snapshot_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshot_states"
  ON snapshot_state FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: TENSION_EDGE
-- ============================================================================
-- Ownership derives from both arc_a and arc_b user_id (both must be owned by user)

CREATE POLICY "Users can view tension_edges for their arcs"
  ON tension_edge FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = tension_edge.arc_a
      AND arc.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = tension_edge.arc_b
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tension_edges for their arcs"
  ON tension_edge FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = tension_edge.arc_a
      AND arc.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = tension_edge.arc_b
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tension_edges for their arcs"
  ON tension_edge FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = tension_edge.arc_a
      AND arc.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = tension_edge.arc_b
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tension_edges for their arcs"
  ON tension_edge FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = tension_edge.arc_a
      AND arc.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = tension_edge.arc_b
      AND arc.user_id = auth.uid()
    )
  );
