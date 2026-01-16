-- ============================================
-- TRANSHERE v1.1 - FIX COUNTRY RANDOMIZATION
-- ============================================

CREATE OR REPLACE FUNCTION populate_mock_analytics_v3(
  days_back INTEGER DEFAULT 14,
  events_per_day INTEGER DEFAULT 200
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_date DATE;
  v_i INTEGER;
  v_models RECORD;
  v_sources RECORD;
  v_tlink RECORD;
  v_countries TEXT[] := ARRAY['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'ES', 'MX', 'CO', 'BR'];
  v_event_type TEXT;
  v_country TEXT;
BEGIN
  -- Loop through each day
  FOR v_date IN 
    SELECT i::date 
    FROM generate_series(
      CURRENT_DATE - (days_back || ' days')::interval, 
      CURRENT_DATE, 
      '1 day'::interval
    ) i
  LOOP
    FOR v_i IN 1..events_per_day LOOP
        -- FIX: Correct random country selection (1-based indexing)
        v_country := v_countries[1 + FLOOR(random() * ARRAY_LENGTH(v_countries, 1))::INTEGER];
        IF random() < 0.2 THEN v_event_type := 'link_click'; ELSE v_event_type := 'page_view'; END IF;

        -- 50% chance it's a tracking link visit, 50% global/direct
        IF random() < 0.5 THEN
            -- Random Tracking Link
            SELECT * INTO v_tlink FROM tracking_links ORDER BY random() LIMIT 1;
            
            IF v_tlink.id IS NOT NULL THEN
                INSERT INTO analytics_events (
                  event_type, model_id, model_slug, source_id, subtag_id, tracking_link_id, 
                  country, created_at, is_tracking_visit
                ) VALUES (
                  v_event_type, v_tlink.model_id, (SELECT slug FROM models WHERE id = v_tlink.model_id), 
                  v_tlink.source_id, v_tlink.subtag_id, v_tlink.id,
                  v_country, v_date + (random() * interval '23 hours'), true
                );
            END IF;
        ELSE
            -- Global/SEO traffic (No tracking link)
            SELECT id INTO v_sources FROM traffic_sources ORDER BY random() LIMIT 1;
            SELECT id, slug INTO v_models FROM models ORDER BY random() LIMIT 1;

            INSERT INTO analytics_events (
              event_type, model_id, model_slug, source_id, 
              country, created_at, is_tracking_visit
            ) VALUES (
              v_event_type, v_models.id, v_models.slug, v_sources.id,
              v_country, v_date + (random() * interval '23 hours'), false
            );
        END IF;
    END LOOP;
  END LOOP;
  
  PERFORM refresh_analytics_views();
END;
$$;
