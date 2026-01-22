-- ============================================
-- TRANSHERE v1.1 - OPTIMIZED ANALYTICS SUMMARY
-- Migration: 030_analytics_optimized_summary.sql
-- ============================================

-- 1. Create specialized materialized view for faster dashboard queries
-- This pre-aggregates the most expensive parts of the dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_dashboard_summary_mv AS
SELECT
  DATE_TRUNC('day', created_at)::DATE as date,
  model_slug,
  country,
  referrer,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as views,
  COUNT(*) FILTER (WHERE event_type = 'link_click') as clicks,
  COUNT(DISTINCT MD5(COALESCE(user_agent, '') || COALESCE(country, '') || TO_CHAR(created_at, 'YYYY-MM-DD'))) as unique_visitors_prox
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '120 days'
GROUP BY 1, 2, 3, 4;

-- Unique index required for CONCURRENTLY refresh
-- Using a simpler index to avoid expression index limitations in some Postgres versions
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_summary_mv_unique 
ON analytics_dashboard_summary_mv(date, model_slug, country, referrer);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_summary_mv_date_desc ON analytics_dashboard_summary_mv(date DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_summary_mv_model ON analytics_dashboard_summary_mv(model_slug) WHERE model_slug IS NOT NULL;

-- 2. Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_analytics_dashboard_summary()
RETURNS void AS $$
BEGIN
  -- Try concurrent refresh first, fallback to regular if needed
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_dashboard_summary_mv;
  EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW analytics_dashboard_summary_mv;
  END;
END;
$$ LANGUAGE plpgsql;

-- 3. Optimized aggregation function using JSONB for complex structures
DROP FUNCTION IF EXISTS get_analytics_summary_v2(TIMESTAMP, TIMESTAMP, TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_analytics_summary_v2(
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP,
  p_model_slug TEXT DEFAULT NULL,
  p_group_by TEXT DEFAULT 'day'
)
RETURNS TABLE (
  period TEXT,
  total_views BIGINT,
  total_clicks BIGINT,
  unique_visitors BIGINT,
  conversion_rate NUMERIC,
  top_countries JSONB,
  top_referrers JSONB,
  model_analytics JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH period_data AS (
    SELECT
      CASE p_group_by
        WHEN 'day' THEN TO_CHAR(date, 'YYYY-MM-DD')
        WHEN 'week' THEN TO_CHAR(DATE_TRUNC('week', date), 'YYYY-MM-DD')
        WHEN 'month' THEN TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM')
        ELSE TO_CHAR(date, 'YYYY-MM-DD')
      END as period_key,
      views,
      clicks,
      unique_visitors_prox as v_unique_visitors,
      country,
      referrer
    FROM analytics_dashboard_summary_mv
    WHERE date BETWEEN p_start_date::DATE AND p_end_date::DATE
    AND (p_model_slug IS NULL OR model_slug = p_model_slug)
  ),
  aggregated AS (
    SELECT
      period_key,
      SUM(views)::BIGINT as total_views,
      SUM(clicks)::BIGINT as total_clicks,
      SUM(v_unique_visitors)::BIGINT as unique_visitors
    FROM period_data
    GROUP BY period_key
  ),
  countries AS (
    SELECT
      period_key,
      JSONB_AGG(
        JSONB_BUILD_OBJECT('country', country, 'count', cnt)
        ORDER BY cnt DESC
      ) FILTER (WHERE rn <= 5) as top_countries
    FROM (
      SELECT
        period_key,
        country,
        SUM(views) as cnt,
        ROW_NUMBER() OVER (PARTITION BY period_key ORDER BY SUM(views) DESC) as rn
      FROM period_data
      WHERE country IS NOT NULL
      GROUP BY period_key, country
    ) sub
    GROUP BY period_key
  ),
  referrers AS (
    SELECT
      period_key,
      JSONB_AGG(
        JSONB_BUILD_OBJECT('referrer', referrer, 'count', cnt)
        ORDER BY cnt DESC
      ) FILTER (WHERE rn <= 5) as top_referrers
    FROM (
      SELECT
        period_key,
        COALESCE(referrer, 'Direct') as referrer,
        SUM(views) as cnt,
        ROW_NUMBER() OVER (PARTITION BY period_key ORDER BY SUM(views) DESC) as rn
      FROM period_data
      GROUP BY period_key, COALESCE(referrer, 'Direct')
    ) sub
    GROUP BY period_key
  ),
  model_metrics AS (
    SELECT
      period_key,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'modelSlug', model_slug,
          'visits', SUM(views),
          'clicks', SUM(clicks)
        )
        ORDER BY SUM(views) DESC
      ) as model_analytics
    FROM period_data
    WHERE model_slug IS NOT NULL
    GROUP BY period_key
  )
  SELECT
    a.period_key,
    a.total_views,
    a.total_clicks,
    a.unique_visitors,
    CASE 
      WHEN a.total_views > 0 
      THEN ROUND((a.total_clicks::NUMERIC / a.total_views) * 100, 2)
      ELSE 0
    END as conversion_rate,
    COALESCE(c.top_countries, '[]'::JSONB) as top_countries,
    COALESCE(r.top_referrers, '[]'::JSONB) as top_referrers,
    COALESCE(m.model_analytics, '[]'::JSONB) as model_analytics
  FROM aggregated a
  LEFT JOIN countries c ON a.period_key = c.period_key
  LEFT JOIN referrers r ON a.period_key = r.period_key
  LEFT JOIN model_metrics m ON a.period_key = m.period_key
  ORDER BY a.period_key DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Update the combined refresh function to include our new view
CREATE OR REPLACE FUNCTION refresh_analytics_all()
RETURNS void AS $$
BEGIN
  PERFORM refresh_analytics_views();
  PERFORM refresh_analytics_dashboard_summary();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON analytics_dashboard_summary_mv TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_analytics_summary_v2(TIMESTAMP, TIMESTAMP, TEXT, TEXT) TO anon, authenticated, service_role;
