-- ============================================
-- TRANSHERE v1.1 - TRACKING INTEGRITY CONSTRAINTS
-- Migration: 029_tracking_integrity_constraints.sql
-- ============================================

-- 1. Ensure tracking_link_id is indexed for fast lookups in analytics_events
-- Note: idx_analytics_part_tracking already exists on the parent table from migration 020
-- But we ensure it's here for clarity and safety.
CREATE INDEX IF NOT EXISTS idx_analytics_tracking_link_id 
ON analytics_events(tracking_link_id) WHERE tracking_link_id IS NOT NULL;

-- 2. Add composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_model_slug_created_at 
ON analytics_events(model_slug, created_at DESC) WHERE model_slug IS NOT NULL;

-- 3. Add check constraint for valid event types if not already present
-- The table was created with: CHECK (event_type IN ('page_view', 'link_click'))
-- We expand this if needed, but for now we'll stick to what the system supports.

-- 4. Add trigger to prevent duplicate rapid clicks (within 2 seconds)
-- This prevents accidental double-clicks or refresh spamming from inflating stats.
CREATE OR REPLACE FUNCTION prevent_rapid_duplicate_clicks()
RETURNS TRIGGER AS $$
BEGIN
  -- We only check for link_click events
  IF NEW.event_type = 'link_click' AND NEW.tracking_link_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM analytics_events
      WHERE tracking_link_id = NEW.tracking_link_id
      AND event_type = 'link_click'
      AND user_agent = NEW.user_agent
      AND (
        (country = NEW.country OR (country IS NULL AND NEW.country IS NULL))
      )
      AND created_at > NOW() - INTERVAL '2 seconds'
    ) THEN
      RETURN NULL; -- Silently ignore duplicate
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- In Postgres, triggers on partitioned tables are applied to individual partitions
-- But in Postgres 11+, they can be defined on the parent table.
DROP TRIGGER IF EXISTS trg_prevent_rapid_clicks ON analytics_events;
CREATE TRIGGER trg_prevent_rapid_clicks
BEFORE INSERT ON analytics_events
FOR EACH ROW
EXECUTE FUNCTION prevent_rapid_duplicate_clicks();
