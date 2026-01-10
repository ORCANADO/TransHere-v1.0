-- Create the 'models' table
-- This table stores model profiles for the landing page
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  social_link TEXT,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security (RLS)
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read Access
-- Allows anonymous (anon) and authenticated users to SELECT all rows
CREATE POLICY "Public Read Access"
  ON models
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Admin Write Access
-- Only allows service_role to INSERT, UPDATE, or DELETE rows
-- This ensures all write operations go through the dashboard/admin interface
CREATE POLICY "Admin Write Access"
  ON models
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create an index on is_pinned for faster queries when filtering pinned models
CREATE INDEX IF NOT EXISTS idx_models_is_pinned ON models(is_pinned);

-- Create an index on created_at for sorting by newest first
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at DESC);

