-- Enable Realtime for stories and story_groups tables
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events
-- Required for real-time story updates without page refresh
--
-- Note: Realtime must be enabled in Supabase Dashboard first:
-- 1. Go to Database > Replication
-- 2. Enable Realtime for your project
-- 3. Then run this migration

-- Enable the realtime extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "realtime";

-- Add story_groups table to the realtime publication (if publication exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE story_groups;
  END IF;
END $$;

-- Add stories table to the realtime publication (if publication exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stories;
  END IF;
END $$;
