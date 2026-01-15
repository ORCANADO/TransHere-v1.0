-- ============================================
-- TRANSHERE v1.1 - MOCK ANALYTICS DATA GENERATOR
-- Migration: 021_insert_mock_analytics.sql
-- ============================================

-- Function to populate analytics with mock data
CREATE OR REPLACE FUNCTION populate_mock_analytics(
  days_back INTEGER DEFAULT 90,
  events_per_day_min INTEGER DEFAULT 50,
  events_per_day_max INTEGER DEFAULT 200
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_date DATE;
  v_event_count INTEGER;
  v_i INTEGER;
  v_models UUID[];
  v_sources UUID[];
  v_model_id UUID;
  v_model_slug TEXT;
  v_source_id UUID;
  v_countries TEXT[] := ARRAY['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'MX', 'CO', 'BR'];
  v_event_type TEXT;
  v_country TEXT;
  v_is_click BOOLEAN;
BEGIN
  -- Get all model IDs and slugs
  SELECT ARRAY_AGG(id) INTO v_models FROM models;
  
  -- Get all traffic source IDs
  SELECT ARRAY_AGG(id) INTO v_sources FROM traffic_sources;
  
  -- Validation
  IF ARRAY_LENGTH(v_models, 1) IS NULL THEN
    RAISE NOTICE 'No models found. Skipping mock data generation.';
    RETURN;
  END IF;

  -- Loop through dates
  -- Ensure we don't go before 2026-01-01 as that's when partitions start
  FOR v_date IN 
    SELECT i::date 
    FROM generate_series(
      GREATEST(CURRENT_DATE - (days_back || ' days')::interval, '2026-01-01'::date), 
      CURRENT_DATE, 
      '1 day'::interval
    ) i
  LOOP
    -- varied daily traffic (weekend dip simulation)
    IF EXTRACT(ISODOW FROM v_date) IN (6, 7) THEN
       v_event_count := FLOOR(random() * (events_per_day_max - events_per_day_min) * 0.7 + events_per_day_min * 0.7);
    ELSE
       v_event_count := FLOOR(random() * (events_per_day_max - events_per_day_min) + events_per_day_min);
    END IF;

    -- Generate events for the day
    FOR v_i IN 1..v_event_count LOOP
      -- Select random model
      v_model_id := v_models[FLOOR(random() * ARRAY_LENGTH(v_models, 1) + 1)];
      SELECT slug INTO v_model_slug FROM models WHERE id = v_model_id;
      
      -- Select random source (sometimes null for direct)
      IF random() < 0.8 AND ARRAY_LENGTH(v_sources, 1) > 0 THEN
        v_source_id := v_sources[FLOOR(random() * ARRAY_LENGTH(v_sources, 1) + 1)];
      ELSE
        v_source_id := NULL;
      END IF;
      
      -- Select random country weighted slightly to US (first in array)
      IF random() < 0.4 THEN
        v_country := 'US';
      ELSE
        v_country := v_countries[FLOOR(random() * ARRAY_LENGTH(v_countries, 1) + 1)];
      END IF;
      
      -- Determine event type (View vs Click)
      -- 10-20% CTR
      IF random() < 0.15 THEN
        v_event_type := 'link_click';
      ELSE
        v_event_type := 'page_view';
      END IF;

      -- Insert Event
      INSERT INTO analytics_events (
        event_type,
        model_id,
        model_slug,
        source_id,
        country,
        created_at,
        is_tracking_visit
      ) VALUES (
        v_event_type,
        v_model_id,
        v_model_slug,
        v_source_id,
        v_country,
        -- Random time during the day
        v_date + (random() * interval '24 hours'),
        (v_source_id IS NOT NULL) -- If source exists, treat as tracking visit for mock purposes
      );
    END LOOP;
    
    RAISE NOTICE 'Generated % events for %', v_event_count, v_date;
  END LOOP;

  -- Refresh views
  PERFORM refresh_analytics_views();
END;
$$;

-- Execute only if running in dev/test (comment out for production safety if manual running)
-- SELECT populate_mock_analytics(90, 100, 500); 
