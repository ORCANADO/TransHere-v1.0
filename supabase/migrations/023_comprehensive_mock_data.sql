-- ============================================
-- TRANSHERE v1.1 - COMPLETE DATA RESET & MOCK GENERATOR
-- Generates: Models, Sources, Subtags, Tracking Links, and Analytics
-- ============================================

-- 1. DELETE existing analytics to start clean
DELETE FROM analytics_events;
DELETE FROM tracking_links;
DELETE FROM tracking_subtags;

-- 2. Ensure we have basic sources if they don't exist
INSERT INTO traffic_sources (name, slug)
VALUES 
  ('Direct', 'direct'),
  ('Google SEO', 'google'),
  ('Instagram', 'instagram'),
  ('Twitter/X', 'twitter'),
  ('TikTok', 'tiktok')
ON CONFLICT (slug) DO NOTHING;

-- 3. Create some Subtags for Instagram
INSERT INTO tracking_subtags (source_id, name, slug)
SELECT id, 'Bio Link', 'bio' FROM traffic_sources WHERE slug = 'instagram'
ON CONFLICT (source_id, slug) DO NOTHING;

INSERT INTO tracking_subtags (source_id, name, slug)
SELECT id, 'Story Swipe', 'story' FROM traffic_sources WHERE slug = 'instagram'
ON CONFLICT (source_id, slug) DO NOTHING;

-- 4. Create some Tracking Links for models
DO $$
DECLARE
    v_model RECORD;
    v_source_id UUID;
    v_subtag_id UUID;
BEGIN
    FOR v_model IN SELECT id, slug FROM models LIMIT 3 LOOP
        -- Create a tracking link for Instagram Bio for this model
        SELECT id INTO v_source_id FROM traffic_sources WHERE slug = 'instagram';
        SELECT id INTO v_subtag_id FROM tracking_subtags WHERE source_id = v_source_id AND slug = 'bio';
        
        -- Mapping to actual schema (no 'name' or 'destination_url' columns in tracking_links)
        INSERT INTO tracking_links (model_id, source_id, subtag_id, slug)
        VALUES (v_model.id, v_source_id, v_subtag_id, v_model.slug || '-ig-bio')
        ON CONFLICT (model_id, slug) DO NOTHING;
    END LOOP;
END $$;


-- 5. Enhanced Population Function (Linked + Unlinked data)
CREATE OR REPLACE FUNCTION populate_mock_analytics_v3(
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
        v_country := v_countries[FLOOR(random() * ARRAY_LENGTH(v_countries, 1) + 1)];
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

-- Run it:
-- SELECT populate_mock_analytics_v3(14, 200);
