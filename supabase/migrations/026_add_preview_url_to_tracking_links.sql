-- Migration: Add preview_url column and optimize indexes for tracking_links
-- Version: 1.1
-- Date: 2026-01-15

-- Rename traffic_sources to tracking_sources for consistency with new tracking system
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'traffic_sources'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tracking_sources'
  ) THEN
    ALTER TABLE traffic_sources RENAME TO tracking_sources;
  END IF;
END $$;

-- Add preview_url column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_links' AND column_name = 'preview_url'
  ) THEN
    ALTER TABLE tracking_links ADD COLUMN preview_url TEXT;
    COMMENT ON COLUMN tracking_links.preview_url IS 'Reference URL where the tracking link is placed (e.g., Instagram post URL)';
  END IF;
END $$;

-- Add composite index for efficient model-based queries
CREATE INDEX IF NOT EXISTS idx_tracking_links_model_archived 
ON tracking_links (model_id, is_archived);

-- Add index for source lookups
CREATE INDEX IF NOT EXISTS idx_tracking_links_source 
ON tracking_links (source_id);

-- Ensure tracking_sources has is_custom column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_sources' AND column_name = 'is_custom'
  ) THEN
    ALTER TABLE tracking_sources ADD COLUMN is_custom BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Insert default traffic sources if not exist
-- Using slug for conflict resolution as names might have minor casing differences
INSERT INTO tracking_sources (name, is_custom, slug) VALUES
  ('Instagram', false, 'instagram'),
  ('X', false, 'x'),
  ('Reddit', false, 'reddit'),
  ('TikTok', false, 'tiktok'),
  ('Facebook', false, 'facebook'),
  ('Dating app', false, 'dating-app'),
  ('Bluesky', false, 'bluesky')
ON CONFLICT (slug) DO NOTHING;

-- Create unique constraint on source name if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tracking_sources_name_unique'
  ) THEN
    -- Check if it was named traffic_sources_name_key or similar
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'traffic_sources_name_key') THEN
        ALTER TABLE tracking_sources RENAME CONSTRAINT traffic_sources_name_key TO tracking_sources_name_unique;
    ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'traffic_sources_name_unique') THEN
        ALTER TABLE tracking_sources RENAME CONSTRAINT traffic_sources_name_unique TO tracking_sources_name_unique;
    ELSE
        ALTER TABLE tracking_sources ADD CONSTRAINT tracking_sources_name_unique UNIQUE (name);
    END IF;
  END IF;

  -- Also rename the slug constraint for consistency
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'traffic_sources_slug_key') THEN
    ALTER TABLE tracking_sources RENAME CONSTRAINT traffic_sources_slug_key TO tracking_sources_slug_unique;
  END IF;
END $$;
