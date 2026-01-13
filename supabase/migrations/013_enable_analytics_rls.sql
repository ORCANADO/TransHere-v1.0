-- Migration: Enable RLS and add SELECT policy for analytics_events table
-- This allows the admin dashboard to read analytics data using the anon key
-- Alternative: Use the /api/admin/analytics route with service_role key (recommended)

-- Enable RLS on analytics_events table
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access for admin dashboard (using anon key)
-- This policy allows anyone with the anon key to read analytics_events
-- For better security, use the /api/admin/analytics route with service_role key instead
CREATE POLICY "Allow public read access for analytics" ON analytics_events
  FOR SELECT
  USING (true);

-- Note: If you prefer admin-only access via service_role key, you can skip this policy
-- and use the /api/admin/analytics route which uses SUPABASE_SERVICE_ROLE_KEY
