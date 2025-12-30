-- Create project_assets table for Library tab
-- Supports links, YouTube embeds, and file uploads (PDF/images)

CREATE TABLE IF NOT EXISTS project_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  type text NOT NULL CHECK (type IN ('link', 'youtube', 'file')),
  title text NOT NULL,
  url text NULL,              -- for link/youtube
  domain text NULL,           -- parsed domain for display
  note text NULL,             -- user-provided context/description
  
  storage_path text NULL,     -- for file uploads
  mime_type text NULL,
  file_size int NULL,
  width int NULL,             -- optional for images
  height int NULL,
  
  is_inactive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT file_requires_storage CHECK (
    (type = 'file' AND storage_path IS NOT NULL AND mime_type IS NOT NULL) OR
    (type != 'file')
  ),
  CONSTRAINT link_requires_url CHECK (
    (type IN ('link', 'youtube') AND url IS NOT NULL) OR
    (type = 'file')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_assets_project_created 
  ON project_assets(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_assets_project_inactive_created 
  ON project_assets(project_id, is_inactive, created_at DESC);

-- RLS Policies
ALTER TABLE project_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own assets
CREATE POLICY "Users can view their own assets"
  ON project_assets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own assets
CREATE POLICY "Users can insert their own assets"
  ON project_assets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own assets
CREATE POLICY "Users can update their own assets"
  ON project_assets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own assets
CREATE POLICY "Users can delete their own assets"
  ON project_assets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_project_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_assets_updated_at
  BEFORE UPDATE ON project_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_project_assets_updated_at();

