-- ============================================
-- TRANSHERE v1.1 - EXPAND ANALYTICS EVENT TYPES & REBUILD VIEWS
-- Migration: 032_add_bridge_view_type.sql
-- ============================================

-- 1. Update the event type constraint to include 'bridge_view'
ALTER TABLE analytics_events 
DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE analytics_events 
ADD CONSTRAINT analytics_events_event_type_check 
CHECK (event_type IN ('page_view', 'link_click', 'story_view', 'bridge_view', 'conversion'));

-- 2. Update Materialized Views to include the new types in the aggregation logic
-- We treat 'bridge_view' and 'story_view' as "views" for the dashboard charts

-- Re-create Daily Stats
DROP MATERIALIZED VIEW IF EXISTS analytics_daily_stats CASCADE;
CREATE MATERIALIZED VIEW analytics_daily_stats AS
SELECT 
  DATE_TRUNC('day', created_at)::DATE AS date,
  COALESCE(model_slug, 'unknown') AS model_slug,
  COALESCE(country, 'Unknown') AS country,
  COALESCE(tracking_link_id::TEXT, 'organic') AS traffic_source,
  COUNT(*) FILTER (WHERE event_type IN ('page_view', 'bridge_view', 'story_view')) AS views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS clicks,
  COUNT(*) AS total_events
FROM analytics_events
WHERE created_at IS NOT NULL
GROUP BY 1, 2, 3, 4;

CREATE UNIQUE INDEX idx_daily_stats_unique ON analytics_daily_stats (date, model_slug, country, traffic_source);
CREATE INDEX idx_daily_stats_date ON analytics_daily_stats (date DESC);
CREATE INDEX idx_daily_stats_model ON analytics_daily_stats (model_slug);

-- Re-create Hourly Stats
DROP MATERIALIZED VIEW IF EXISTS analytics_hourly_stats CASCADE;
CREATE MATERIALIZED VIEW analytics_hourly_stats AS
SELECT 
  DATE_TRUNC('hour', created_at) AS hour,
  COALESCE(model_slug, 'unknown') AS model_slug,
  tracking_link_id,
  COALESCE(country, 'Unknown') AS country,
  COUNT(*) FILTER (WHERE event_type IN ('page_view', 'bridge_view', 'story_view')) AS views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS clicks
FROM analytics_events
WHERE created_at > (NOW() - INTERVAL '7 days')
GROUP BY 1, 2, 3, 4;

CREATE UNIQUE INDEX idx_hourly_stats_unique ON analytics_hourly_stats (hour, model_slug, COALESCE(tracking_link_id::TEXT, 'null'), country);
CREATE INDEX idx_hourly_stats_hour ON analytics_hourly_stats (hour DESC);

-- Re-create Model Summary
DROP MATERIALIZED VIEW IF EXISTS analytics_model_summary CASCADE;
CREATE MATERIALIZED VIEW analytics_model_summary AS
SELECT 
  model_slug,
  COUNT(*) FILTER (WHERE event_type IN ('page_view', 'bridge_view', 'story_view')) AS total_views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS total_clicks,
  COUNT(DISTINCT country) AS unique_countries,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) AS active_days,
  MIN(created_at) AS first_event,
  MAX(created_at) AS last_event,
  CASE 
    WHEN COUNT(*) FILTER (WHERE event_type IN ('page_view', 'bridge_view', 'story_view')) > 0 
    THEN ROUND(
      (COUNT(*) FILTER (WHERE event_type = 'link_click')::NUMERIC / 
       COUNT(*) FILTER (WHERE event_type IN ('page_view', 'bridge_view', 'story_view'))::NUMERIC) * 100, 2
    )
    ELSE 0 
  END AS ctr_percentage
FROM analytics_events
WHERE model_slug IS NOT NULL
GROUP BY 1;

CREATE UNIQUE INDEX idx_model_summary_unique ON analytics_model_summary (model_slug);

-- Re-create Source Summary
DROP MATERIALIZED VIEW IF EXISTS analytics_source_summary CASCADE;
CREATE MATERIALIZED VIEW analytics_source_summary AS
SELECT 
  COALESCE(ts.name, 'Organic') AS source_name,
  tst.name AS subtag_name,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE ae.event_type IN ('page_view', 'bridge_view', 'story_view')) AS total_views,
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

CREATE UNIQUE INDEX idx_source_summary_unique ON analytics_source_summary (source_name, COALESCE(subtag_name, 'none'));

-- Re-create Country Summary
DROP MATERIALIZED VIEW IF EXISTS analytics_country_summary CASCADE;
CREATE MATERIALIZED VIEW analytics_country_summary AS
SELECT 
  COALESCE(country, 'Unknown') AS country,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE event_type IN ('page_view', 'bridge_view', 'story_view')) AS total_views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') AS total_clicks,
  COUNT(DISTINCT model_slug) AS models_visited,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) AS active_days
FROM analytics_events
GROUP BY 1;

CREATE UNIQUE INDEX idx_country_summary_unique ON analytics_country_summary (country);

-- Permissions
GRANT SELECT ON analytics_daily_stats TO anon, authenticated;
GRANT SELECT ON analytics_hourly_stats TO anon, authenticated;
GRANT SELECT ON analytics_source_summary TO anon, authenticated;
GRANT SELECT ON analytics_model_summary TO anon, authenticated;
GRANT SELECT ON analytics_country_summary TO anon, authenticated;
