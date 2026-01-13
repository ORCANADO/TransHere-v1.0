-- Add missing columns to analytics_events table for enhanced dashboard functionality
ALTER TABLE analytics_events 
  ADD COLUMN IF NOT EXISTS model_slug TEXT,
  ADD COLUMN IF NOT EXISTS page_path TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_model_slug ON analytics_events(model_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_page_path ON analytics_events(page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_country ON analytics_events(country);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);

-- Add comment for documentation
COMMENT ON COLUMN analytics_events.model_slug IS 'Model slug for direct filtering without joins';
COMMENT ON COLUMN analytics_events.page_path IS 'URL path where the event occurred';
COMMENT ON COLUMN analytics_events.referrer IS 'HTTP referrer header';
COMMENT ON COLUMN analytics_events.user_agent IS 'User agent string for device/browser tracking';
