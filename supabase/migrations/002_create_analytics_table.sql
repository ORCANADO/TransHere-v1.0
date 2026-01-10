-- Create the event_type ENUM
CREATE TYPE event_type AS ENUM ('view', 'click_social', 'click_content');

-- Create the 'analytics_events' table
-- This table stores anonymous analytics events for tracking user interactions
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type event_type NOT NULL,
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  country TEXT,
  city TEXT
);

-- Add constraint to ensure country is exactly 2 characters when provided
ALTER TABLE analytics_events
  ADD CONSTRAINT check_country_length
  CHECK (country IS NULL OR char_length(country) = 2);

-- Enable Row Level Security (RLS)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Public Logger
-- Allows anonymous (anon) users to INSERT rows but NOT SELECT (read) them
-- This ensures analytics data can be collected without exposing it to public users
CREATE POLICY "Public Logger"
  ON analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create an index on model_id for faster queries when filtering by model
CREATE INDEX IF NOT EXISTS idx_analytics_events_model_id ON analytics_events(model_id);

-- Create an index on created_at for time-based analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

