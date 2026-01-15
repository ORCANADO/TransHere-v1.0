-- ============================================
-- TRANSHERE v1.1 - DATA RESET & MOCK GENERATOR
-- Use this to clear existing data and generate fresh mock stats
-- ============================================

-- 1. DELETE existing mock data to clear the bloat
-- ONLY run this if you want to start fresh!
DELETE FROM analytics_events;

-- 2. Improved Population Function
CREATE OR REPLACE FUNCTION populate_mock_analytics_v2(
  days_back INTEGER DEFAULT 14,
  events_per_day INTEGER DEFAULT 100
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_date DATE;
  v_i INTEGER;
  v_models RECORD;
  v_sources RECORD;
  v_countries TEXT[] := ARRAY['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'MX', 'CO', 'BR'];
  v_event_type TEXT;
  v_country TEXT;
BEGIN
  -- Cleanup debug
  RAISE NOTICE 'Starting mock data generation for last % days', days_back;

  -- Loop through each day from start to today
  FOR v_date IN 
    SELECT i::date 
    FROM generate_series(
      GREATEST(CURRENT_DATE - (days_back || ' days')::interval, '2026-01-01'::date), 
      CURRENT_DATE, 
      '1 day'::interval
    ) i
  LOOP
    -- For each model, generate some traffic
    FOR v_models IN SELECT id, slug FROM models LOOP
      
      -- Generate events_per_day / num_models per model roughly
      FOR v_i IN 1..(events_per_day / 5) LOOP -- Spread across models
        
        -- Select random country
        v_country := v_countries[FLOOR(random() * ARRAY_LENGTH(v_countries, 1) + 1)];
        
        -- Event type
        IF random() < 0.15 THEN v_event_type := 'link_click'; ELSE v_event_type := 'page_view'; END IF;

        -- Random source
        SELECT id INTO v_sources FROM traffic_sources ORDER BY random() LIMIT 1;

        INSERT INTO analytics_events (
          event_type, model_id, model_slug, source_id, country, created_at, is_tracking_visit
        ) VALUES (
          v_event_type, v_models.id, v_models.slug, v_sources.id, v_country,
          v_date + (random() * interval '23 hours'), true
        );
      END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated data for %', v_date;
  END LOOP;

  -- Refresh views
  PERFORM refresh_analytics_views();
END;
$$;

-- Run it:
-- SELECT populate_mock_analytics_v2(14, 200);
