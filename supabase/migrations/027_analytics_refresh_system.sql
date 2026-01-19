-- Migration: Analytics Refresh System
-- Purpose: Manage materialized view refreshes and track last update times
-- Version: 1.1
-- Date: 2026-01-XX

-- ============================================
-- SYSTEM CONFIGURATION TABLE
-- ============================================
-- Stores system-wide configuration including refresh timestamps

CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_system_config_updated ON system_config (updated_at DESC);

-- Insert default configuration
INSERT INTO system_config (key, value) VALUES 
  ('analytics_last_refresh', '{"timestamp": null, "duration_ms": null, "status": "never"}'),
  ('analytics_refresh_interval_minutes', '{"value": 15}')
ON CONFLICT (key) DO NOTHING;

-- RLS policies
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON system_config
  FOR ALL USING (true) WITH CHECK (true);

-- Allow anon/authenticated to read
CREATE POLICY "Public read access" ON system_config
  FOR SELECT USING (true);


DROP FUNCTION IF EXISTS refresh_analytics_views();

CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_ms INTEGER;
  result JSONB;
BEGIN
  start_time := clock_timestamp();
  
  -- Refresh views in order of dependency (none have dependencies currently)
  -- Use CONCURRENTLY for views with unique indexes to allow concurrent reads
  
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_stats;
  EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails (e.g., first run), do regular refresh
    REFRESH MATERIALIZED VIEW analytics_daily_stats;
  END;
  
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_hourly_stats;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics_hourly_stats;
  END;
  
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_source_summary;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics_source_summary;
  END;
  
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_model_summary;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics_model_summary;
  END;
  
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_country_summary;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics_country_summary;
  END;
  
  end_time := clock_timestamp();
  duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  
  -- Build result JSON
  result := jsonb_build_object(
    'timestamp', end_time,
    'duration_ms', duration_ms,
    'status', 'success',
    'views_refreshed', ARRAY[
      'analytics_daily_stats',
      'analytics_hourly_stats', 
      'analytics_source_summary',
      'analytics_model_summary',
      'analytics_country_summary'
    ]
  );
  
  -- Update system config with last refresh info
  UPDATE system_config 
  SET 
    value = result,
    updated_at = NOW()
  WHERE key = 'analytics_last_refresh';
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error and return failure status
  result := jsonb_build_object(
    'timestamp', clock_timestamp(),
    'status', 'error',
    'error_message', SQLERRM,
    'error_detail', SQLSTATE
  );
  
  UPDATE system_config 
  SET 
    value = result,
    updated_at = NOW()
  WHERE key = 'analytics_last_refresh';
  
  RETURN result;
END;
$$;


-- ============================================
-- GET LAST REFRESH INFO FUNCTION
-- ============================================
-- Helper function to get last refresh timestamp

DROP FUNCTION IF EXISTS get_analytics_last_refresh();

CREATE OR REPLACE FUNCTION get_analytics_last_refresh()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT value FROM system_config WHERE key = 'analytics_last_refresh';
$$;


-- ============================================
-- CHECK IF REFRESH NEEDED FUNCTION
-- ============================================
-- Returns true if last refresh was more than X minutes ago

DROP FUNCTION IF EXISTS analytics_refresh_needed(INTEGER);

CREATE OR REPLACE FUNCTION analytics_refresh_needed(minutes_threshold INTEGER DEFAULT 60)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  last_refresh TIMESTAMPTZ;
  config_value JSONB;
BEGIN
  SELECT value INTO config_value 
  FROM system_config 
  WHERE key = 'analytics_last_refresh';
  
  -- If no config or null timestamp, refresh is needed
  IF config_value IS NULL OR config_value->>'timestamp' IS NULL THEN
    RETURN TRUE;
  END IF;
  
  last_refresh := (config_value->>'timestamp')::TIMESTAMPTZ;
  
  -- Check if more than threshold minutes have passed
  RETURN (NOW() - last_refresh) > (minutes_threshold || ' minutes')::INTERVAL;
END;
$$;


-- ============================================
-- SCHEDULED REFRESH (pg_cron if available)
-- ============================================
-- Note: pg_cron may not be available on Supabase free tier
-- This section is for documentation and future use

-- To enable scheduled refresh (run in Supabase dashboard if pg_cron is available):
-- SELECT cron.schedule(
--   'refresh-analytics-views',
--   '*/15 * * * *',  -- Every 15 minutes
--   'SELECT refresh_analytics_views()'
-- );

-- To check scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove scheduled job:
-- SELECT cron.unschedule('refresh-analytics-views');


-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO service_role;
GRANT EXECUTE ON FUNCTION get_analytics_last_refresh() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION analytics_refresh_needed(INTEGER) TO anon, authenticated, service_role;
