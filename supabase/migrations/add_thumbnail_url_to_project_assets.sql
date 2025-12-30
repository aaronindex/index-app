-- Add thumbnail_url column to project_assets table

ALTER TABLE project_assets
ADD COLUMN IF NOT EXISTS thumbnail_url text NULL;

