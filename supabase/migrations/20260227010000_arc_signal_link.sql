-- arc_signal_link: link structural signals to arcs for traceability

CREATE TABLE IF NOT EXISTS arc_signal_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc_id UUID NOT NULL REFERENCES arc(id) ON DELETE CASCADE,
  signal_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  kind TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arc_signal_link_arc_id ON arc_signal_link(arc_id);
CREATE INDEX IF NOT EXISTS idx_arc_signal_link_signal_id ON arc_signal_link(signal_id);
CREATE INDEX IF NOT EXISTS idx_arc_signal_link_project_id ON arc_signal_link(project_id);

-- Prevent duplicate links per arc/signal pair
CREATE UNIQUE INDEX IF NOT EXISTS uniq_arc_signal_link_arc_signal
  ON arc_signal_link(arc_id, signal_id);

-- Enable RLS
ALTER TABLE arc_signal_link ENABLE ROW LEVEL SECURITY;

-- RLS policies: ownership derives from arc.user_id

CREATE POLICY "Users can view arc_signal_links for their arcs"
  ON arc_signal_link FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = arc_signal_link.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create arc_signal_links for their arcs"
  ON arc_signal_link FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = arc_signal_link.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update arc_signal_links for their arcs"
  ON arc_signal_link FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = arc_signal_link.arc_id
      AND arc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete arc_signal_links for their arcs"
  ON arc_signal_link FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM arc
      WHERE arc.id = arc_signal_link.arc_id
      AND arc.user_id = auth.uid()
    )
  );

