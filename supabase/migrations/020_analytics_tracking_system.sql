-- ============================================
-- TRANSHERE v1.1 - ANALYTICS TRACKING SYSTEM
-- Migration: 020_analytics_tracking_system.sql
-- ============================================
-- 
-- PRE-MIGRATION REQUIREMENTS:
-- 1. Enable pg_cron extension in Supabase Dashboard:
--    Dashboard > Database > Extensions > Search "pg_cron" > Enable
-- 
-- 2. Backup existing analytics_events table:
--    pg_dump -t analytics_events > analytics_backup.sql
--
-- 3. Ensure sufficient disk space for partitions
--
-- POST-MIGRATION VERIFICATION:
-- Run the verification queries at the end of this file
-- ============================================

-- ============================================
-- SECTION 1: Extensions
-- ============================================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Note: pg_cron must be enabled via Supabase Dashboard > Database > Extensions BEFORE running this migration
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================
-- SECTION 2: Traffic Sources Table (Predefined Tags)
-- ============================================

-- Traffic sources (tags) - predefined + custom
CREATE TABLE IF NOT EXISTS traffic_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT false,
  is_deletable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default sources (non-deletable) in exact order specified
INSERT INTO traffic_sources (name, slug, is_default, is_deletable, sort_order) VALUES
  ('Instagram', 'instagram', true, false, 1),
  ('X', 'x', true, false, 2),
  ('Reddit', 'reddit', true, false, 3),
  ('TikTok', 'tiktok', true, false, 4),
  ('Facebook', 'facebook', true, false, 5),
  ('Dating App', 'dating-app', true, false, 6),
  ('Bluesky', 'bluesky', true, false, 7)
ON CONFLICT (slug) DO NOTHING;

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_traffic_sources_sort ON traffic_sources(sort_order);

-- ============================================
-- SECTION 3: Tracking Subtags Table
-- ============================================

-- Subtags for granular tracking (optional per link)
CREATE TABLE IF NOT EXISTS tracking_subtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES traffic_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subtags_source ON tracking_subtags(source_id);

-- ============================================
-- SECTION 4: Tracking Links Table
-- ============================================

-- Tracking links table (core tracking functionality)
CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES traffic_sources(id) ON DELETE RESTRICT,
  subtag_id UUID REFERENCES tracking_subtags(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,                    -- e.g., "c1", "c2", "c3"
  is_active BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, slug)
);

-- Critical indexes for tracking link lookups
CREATE INDEX IF NOT EXISTS idx_tracking_links_model ON tracking_links(model_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_source ON tracking_links(source_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_slug ON tracking_links(slug);
CREATE INDEX IF NOT EXISTS idx_tracking_links_active ON tracking_links(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tracking_links_lookup ON tracking_links(model_id, slug) WHERE is_archived = false;

-- ============================================
-- SECTION 5: Partitioned Analytics Events Table
-- ============================================

-- Create new partitioned analytics table
CREATE TABLE IF NOT EXISTS analytics_events_partitioned (
  id UUID DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'link_click')),
  model_id UUID,
  model_slug TEXT,
  tracking_link_id UUID,
  source_id UUID,
  subtag_id UUID,
  is_tracking_visit BOOLEAN DEFAULT false,
  page_path TEXT,
  country TEXT,
  city TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Generate partitions for January 2026 through December 2026
CREATE TABLE IF NOT EXISTS analytics_events_2026_01 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_02 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_03 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_04 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_05 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_06 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_07 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_08 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_09 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_10 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_11 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS analytics_events_2026_12 PARTITION OF analytics_events_partitioned
  FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- Create indexes on partitioned table (automatically propagate to all partitions)
CREATE INDEX IF NOT EXISTS idx_analytics_part_created ON analytics_events_partitioned(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_part_model ON analytics_events_partitioned(model_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_part_source ON analytics_events_partitioned(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_part_event ON analytics_events_partitioned(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_part_country ON analytics_events_partitioned(country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_part_tracking ON analytics_events_partitioned(tracking_link_id) WHERE tracking_link_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_part_composite ON analytics_events_partitioned(created_at, model_slug, event_type);

-- ============================================
-- SECTION 6: Data Migration from Existing Table
-- ============================================

-- Migrate existing data from analytics_events to partitioned table
-- Event type mapping: 'view' -> 'page_view', 'click_social'/'click_content' -> 'link_click'
-- Only migrate data that falls within our partition range
INSERT INTO analytics_events_partitioned (
  id, 
  event_type, 
  model_id, 
  model_slug, 
  page_path, 
  country, 
  city, 
  referrer, 
  user_agent, 
  created_at,
  is_tracking_visit
)
SELECT 
  COALESCE(id, uuid_generate_v4()),
  CASE 
    WHEN event_type::text = 'view' THEN 'page_view'
    WHEN event_type::text IN ('click_social', 'click_content') THEN 'link_click'
    ELSE 'page_view'  -- fallback for any unexpected values
  END AS event_type,
  model_id,
  model_slug,
  page_path,
  country,
  city,
  referrer,
  user_agent,
  COALESCE(created_at, NOW()),
  false  -- Existing events are not from tracking links
FROM analytics_events
WHERE created_at >= '2026-01-01 00:00:00+00'
  AND created_at < '2027-01-01 00:00:00+00'
ON CONFLICT DO NOTHING;

-- Rename tables for switchover
ALTER TABLE IF EXISTS analytics_events RENAME TO analytics_events_legacy;
ALTER TABLE analytics_events_partitioned RENAME TO analytics_events;

-- ============================================
-- SECTION 7: Materialized View for Hourly Stats
-- ============================================

-- Materialized view for hourly analytics aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_hourly_stats AS
SELECT 
  date_trunc('hour', created_at) AS hour,
  model_slug,
  source_id,
  subtag_id,
  country,
  is_tracking_visit,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS view_count,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS click_count,
  COUNT(*) AS total_events
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY 
  date_trunc('hour', created_at),
  model_slug,
  source_id,
  subtag_id,
  country,
  is_tracking_visit
WITH DATA;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_stats_unique 
  ON analytics_hourly_stats(hour, COALESCE(model_slug, ''), COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(subtag_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(country, ''), is_tracking_visit);

-- Additional indexes for query performance
CREATE INDEX IF NOT EXISTS idx_hourly_stats_hour ON analytics_hourly_stats(hour);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_model ON analytics_hourly_stats(model_slug);
CREATE INDEX IF NOT EXISTS idx_hourly_stats_source ON analytics_hourly_stats(source_id);

-- ============================================
-- SECTION 8: Daily Stats Materialized View
-- ============================================

-- Materialized view for daily stats (for dashboard charts)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_stats AS
SELECT 
  date_trunc('day', created_at) AS day,
  model_slug,
  source_id,
  country,
  is_tracking_visit,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS clicks
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '365 days'
GROUP BY 
  date_trunc('day', created_at),
  model_slug,
  source_id,
  country,
  is_tracking_visit
WITH DATA;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_unique 
  ON analytics_daily_stats(day, COALESCE(model_slug, ''), COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(country, ''), is_tracking_visit);

CREATE INDEX IF NOT EXISTS idx_daily_stats_day ON analytics_daily_stats(day);
CREATE INDEX IF NOT EXISTS idx_daily_stats_model ON analytics_daily_stats(model_slug);

-- ============================================
-- SECTION 9: Refresh Function
-- ============================================

-- Function to refresh all analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refresh hourly stats concurrently (non-blocking)
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_hourly_stats;
  
  -- Refresh daily stats concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_stats;
  
  -- Log refresh completion (optional)
  RAISE NOTICE 'Analytics views refreshed at %', NOW();
END;
$$;

-- ============================================
-- SECTION 10: Cron Job Setup
-- ============================================

-- Schedule cron job to refresh views every 10 minutes
-- Note: pg_cron extension must be enabled in Supabase Dashboard first
SELECT cron.schedule(
  'refresh-analytics-views-10min',  -- Job name
  '*/10 * * * *',                   -- Every 10 minutes
  $$SELECT refresh_analytics_views()$$
);

-- ============================================
-- SECTION 11: Tracking Link Click Increment Function
-- ============================================

-- Function to atomically increment tracking link clicks
CREATE OR REPLACE FUNCTION increment_tracking_link_clicks(link_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tracking_links 
  SET click_count = click_count + 1 
  WHERE id = link_id;
END;
$$;

-- ============================================
-- SECTION 12: Row Level Security Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE traffic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_subtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Traffic sources: public read, service write
CREATE POLICY "Public read traffic_sources" 
  ON traffic_sources FOR SELECT 
  USING (true);

CREATE POLICY "Service write traffic_sources" 
  ON traffic_sources FOR ALL 
  TO service_role
  USING (true) 
  WITH CHECK (true);

-- Tracking subtags: public read, service write
CREATE POLICY "Public read tracking_subtags" 
  ON tracking_subtags FOR SELECT 
  USING (true);

CREATE POLICY "Service write tracking_subtags" 
  ON tracking_subtags FOR ALL 
  TO service_role
  USING (true) 
  WITH CHECK (true);

-- Tracking links: public read active links, service write
CREATE POLICY "Public read active tracking_links" 
  ON tracking_links FOR SELECT 
  USING (is_active = true AND is_archived = false);

CREATE POLICY "Service read all tracking_links" 
  ON tracking_links FOR SELECT 
  TO service_role
  USING (true);

CREATE POLICY "Service write tracking_links" 
  ON tracking_links FOR ALL 
  TO service_role
  USING (true) 
  WITH CHECK (true);

-- Analytics events: public insert, service read
CREATE POLICY "Public insert analytics_events" 
  ON analytics_events FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Service read analytics_events" 
  ON analytics_events FOR SELECT 
  TO service_role
  USING (true);

-- ============================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================

-- Verify partitions created:
-- SELECT tableoid::regclass, count(*) FROM analytics_events GROUP BY tableoid::regclass;

-- Verify materialized views:
-- SELECT * FROM analytics_hourly_stats LIMIT 10;
-- SELECT * FROM analytics_daily_stats LIMIT 10;

-- Verify cron job scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'refresh-analytics-views-10min';

-- Verify traffic sources inserted:
-- SELECT * FROM traffic_sources ORDER BY sort_order;

-- Test refresh function:
-- SELECT refresh_analytics_views();
