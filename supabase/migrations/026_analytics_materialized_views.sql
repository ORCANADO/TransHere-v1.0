-- Migration: Create Analytics Materialized Views
-- Purpose: Pre-aggregate analytics data for sub-500ms dashboard queries
-- Target: Handle 1M+ monthly events efficiently
-- Version: 1.1
-- Date: 2026-01-XX

-- ============================================
-- DAILY AGGREGATED STATISTICS
-- ============================================
-- Aggregates all events by day, model, country, and traffic source
-- Used for: Date range queries, model comparisons, geographic analysis

DROP MATERIALIZED VIEW IF EXISTS analytics_daily_stats CASCADE;

CREATE MATERIALIZED VIEW analytics_daily_stats AS
SELECT 
  DATE_TRUNC('day', created_at)::DATE AS date,
  COALESCE(model_slug, 'unknown') AS model_slug,
  COALESCE(country, 'Unknown') AS country,
  COALESCE(tracking_link_id::TEXT, 'organic') AS traffic_source,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS clicks,
  COUNT(*) AS total_events
FROM analytics_events
WHERE created_at IS NOT NULL
GROUP BY 1, 2, 3, 4;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_daily_stats_unique 
ON analytics_daily_stats (date, model_slug, country, traffic_source);

-- Performance indexes for common query patterns
CREATE INDEX idx_daily_stats_date ON analytics_daily_stats (date DESC);
CREATE INDEX idx_daily_stats_model ON analytics_daily_stats (model_slug);
CREATE INDEX idx_daily_stats_country ON analytics_daily_stats (country);
CREATE INDEX idx_daily_stats_source ON analytics_daily_stats (traffic_source);

-- Composite index for date range + model queries
CREATE INDEX idx_daily_stats_date_model ON analytics_daily_stats (date DESC, model_slug);


-- ============================================
-- HOURLY STATISTICS (RECENT DATA)
-- ============================================
-- Fine-grained hourly data for the last 7 days
-- Used for: Real-time monitoring, recent activity charts

DROP MATERIALIZED VIEW IF EXISTS analytics_hourly_stats CASCADE;

CREATE MATERIALIZED VIEW analytics_hourly_stats AS
SELECT 
  DATE_TRUNC('hour', created_at) AS hour,
  COALESCE(model_slug, 'unknown') AS model_slug,
  tracking_link_id,
  COALESCE(country, 'Unknown') AS country,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS clicks
FROM analytics_events
WHERE created_at > (NOW() - INTERVAL '7 days')
GROUP BY 1, 2, 3, 4;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_hourly_stats_unique 
ON analytics_hourly_stats (hour, model_slug, COALESCE(tracking_link_id::TEXT, 'null'), country);

-- Performance indexes
CREATE INDEX idx_hourly_stats_hour ON analytics_hourly_stats (hour DESC);
CREATE INDEX idx_hourly_stats_model ON analytics_hourly_stats (model_slug);


-- ============================================
-- TRAFFIC SOURCE SUMMARY
-- ============================================
-- Aggregated source statistics for filter dropdowns and overview
-- Used for: Source filter options, traffic attribution summary

DROP MATERIALIZED VIEW IF EXISTS analytics_source_summary CASCADE;

CREATE MATERIALIZED VIEW analytics_source_summary AS
SELECT 
  COALESCE(ts.name, 'Organic') AS source_name,
  tst.name AS subtag_name,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE ae.event_type = 'page_view') AS total_views,
  COUNT(*) FILTER (WHERE ae.event_type = 'link_click') AS total_clicks,
  COUNT(DISTINCT ae.model_slug) AS models_count,
  COUNT(DISTINCT ae.country) AS countries_count,
  MIN(ae.created_at) AS first_event,
  MAX(ae.created_at) AS last_event
FROM analytics_events ae
LEFT JOIN tracking_links tl ON ae.tracking_link_id = tl.id
LEFT JOIN tracking_sources ts ON tl.source_id = ts.id
LEFT JOIN tracking_subtags tst ON tl.subtag_id = tst.id
GROUP BY 1, 2;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_source_summary_unique 
ON analytics_source_summary (source_name, COALESCE(subtag_name, 'none'));

-- Performance index
CREATE INDEX idx_source_summary_name ON analytics_source_summary (source_name);


-- ============================================
-- MODEL PERFORMANCE SUMMARY
-- ============================================
-- Per-model aggregated statistics
-- Used for: Model cards, ranking, quick comparisons

DROP MATERIALIZED VIEW IF EXISTS analytics_model_summary CASCADE;

CREATE MATERIALIZED VIEW analytics_model_summary AS
SELECT 
  model_slug,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS total_clicks,
  COUNT(DISTINCT country) AS unique_countries,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) AS active_days,
  MIN(created_at) AS first_event,
  MAX(created_at) AS last_event,
  -- Calculate CTR
  CASE 
    WHEN COUNT(*) FILTER (WHERE event_type = 'page_view') > 0 
    THEN ROUND(
      (COUNT(*) FILTER (WHERE event_type = 'link_click')::NUMERIC / 
       COUNT(*) FILTER (WHERE event_type = 'page_view')::NUMERIC) * 100, 2
    )
    ELSE 0 
  END AS ctr_percentage
FROM analytics_events
WHERE model_slug IS NOT NULL
GROUP BY 1;

-- Unique index
CREATE UNIQUE INDEX idx_model_summary_unique ON analytics_model_summary (model_slug);

-- Performance indexes
CREATE INDEX idx_model_summary_views ON analytics_model_summary (total_views DESC);
CREATE INDEX idx_model_summary_clicks ON analytics_model_summary (total_clicks DESC);


-- ============================================
-- COUNTRY SUMMARY
-- ============================================
-- Geographic distribution of traffic
-- Used for: Country filter dropdown, geographic charts

DROP MATERIALIZED VIEW IF EXISTS analytics_country_summary CASCADE;

CREATE MATERIALIZED VIEW analytics_country_summary AS
SELECT 
  COALESCE(country, 'Unknown') AS country,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS total_clicks,
  COUNT(DISTINCT model_slug) AS models_visited,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) AS active_days
FROM analytics_events
GROUP BY 1;

-- Unique index
CREATE UNIQUE INDEX idx_country_summary_unique ON analytics_country_summary (country);

-- Performance index
CREATE INDEX idx_country_summary_events ON analytics_country_summary (total_events DESC);


-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Allow anon and authenticated roles to read materialized views

GRANT SELECT ON analytics_daily_stats TO anon, authenticated;
GRANT SELECT ON analytics_hourly_stats TO anon, authenticated;
GRANT SELECT ON analytics_source_summary TO anon, authenticated;
GRANT SELECT ON analytics_model_summary TO anon, authenticated;
GRANT SELECT ON analytics_country_summary TO anon, authenticated;


-- ============================================
-- INITIAL POPULATION
-- ============================================
-- Views are populated on creation, but we can add a comment for documentation
COMMENT ON MATERIALIZED VIEW analytics_daily_stats IS 'Daily aggregated analytics. Refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_stats;';
COMMENT ON MATERIALIZED VIEW analytics_hourly_stats IS 'Hourly analytics for last 7 days. Refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_hourly_stats;';
COMMENT ON MATERIALIZED VIEW analytics_source_summary IS 'Traffic source summary. Refresh: REFRESH MATERIALIZED VIEW analytics_source_summary;';
COMMENT ON MATERIALIZED VIEW analytics_model_summary IS 'Per-model performance summary. Refresh: REFRESH MATERIALIZED VIEW analytics_model_summary;';
COMMENT ON MATERIALIZED VIEW analytics_country_summary IS 'Geographic traffic summary. Refresh: REFRESH MATERIALIZED VIEW analytics_country_summary;';
