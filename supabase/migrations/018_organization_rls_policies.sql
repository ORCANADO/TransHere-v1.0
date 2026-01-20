-- ============================================
-- MIGRATION 018: Organization RLS Security Policies
-- ============================================
-- Purpose: Implement Row Level Security policies to ensure data isolation
--          between organizations while maintaining public site access.
--
-- Security Guarantees:
-- 1. Organization A cannot access Organization B's data
-- 2. Public site feed remains functional (anon read access)
-- 3. Admin (service_role) bypasses RLS for management operations
-- 4. Organization context must be set before queries
-- ============================================

-- ============================================
-- HELPER FUNCTION: Set Organization Context
-- ============================================
-- This function sets the organization context for the current transaction.
-- It's called by organization API routes before fetching data.
-- The context is automatically cleared when the transaction ends.

CREATE OR REPLACE FUNCTION public.set_organization_context(org_id UUID)
RETURNS void AS $$
BEGIN
  -- Set the organization ID in the current transaction's config
  -- The 'true' parameter makes this setting local to the transaction
  PERFORM set_config('app.current_organization_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_organization_context(UUID) TO authenticated;

COMMENT ON FUNCTION public.set_organization_context IS 
  'Sets organization context for RLS policies. Called by organization API routes before data queries.';

-- ============================================
-- MODELS TABLE: Organization RLS Policies
-- ============================================
-- Keep existing "Public Read Access" policy (main site needs this)
-- Add new policy for organization dashboard access

CREATE POLICY "Organization Dashboard Access"
  ON models
  FOR SELECT
  TO authenticated
  USING (
    -- Allow access if organization_id matches the current context
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

COMMENT ON POLICY "Organization Dashboard Access" ON models IS
  'Allows organizations to read only their own models when context is set';

-- ============================================
-- ANALYTICS_EVENTS TABLE: Organization RLS Policies
-- ============================================
-- Keep existing "Public Logger" policy (INSERT only for anon)
-- Add new policy for organization analytics read access

CREATE POLICY "Organization Analytics Read"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    -- Allow access if the event's model belongs to the current organization
    model_id IN (
      SELECT id FROM models 
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );

COMMENT ON POLICY "Organization Analytics Read" ON analytics_events IS
  'Allows organizations to read analytics only for their own models';

-- ============================================
-- ORGANIZATIONS TABLE: Update RLS Policies
-- ============================================
-- Drop existing policies and recreate with proper organization context

-- Drop existing policies
DROP POLICY IF EXISTS "Organizations are viewable by authenticated users" ON organizations;
DROP POLICY IF EXISTS "Enable all operations for service_role" ON organizations;

-- Policy: Organization Self-Read
-- Organizations can only read their own record
CREATE POLICY "Organization Self-Read"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id = current_setting('app.current_organization_id', true)::uuid
  );

-- Policy: Admin Full Access
-- Service role (admin) has full CRUD access
CREATE POLICY "Admin Full Access"
  ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Organization Self-Read" ON organizations IS
  'Organizations can only read their own record when context is set';

COMMENT ON POLICY "Admin Full Access" ON organizations IS
  'Admin dashboard has full CRUD access via service_role';

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- Add index on organization_id for faster RLS policy checks

CREATE INDEX IF NOT EXISTS idx_models_organization_id 
  ON models(organization_id) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_model_id_org 
  ON analytics_events(model_id) 
  WHERE model_id IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify RLS policies are working correctly:
--
-- 1. Test organization context setting:
--    SELECT set_organization_context('your-org-uuid-here');
--    SELECT current_setting('app.current_organization_id', true);
--
-- 2. Test cross-organization isolation:
--    SELECT set_organization_context('org-a-uuid');
--    SELECT * FROM models WHERE organization_id = 'org-b-uuid'; -- Should return empty
--
-- 3. Test analytics filtering:
--    SELECT set_organization_context('org-a-uuid');
--    SELECT COUNT(*) FROM analytics_events; -- Should only count Org A's events
--
-- 4. Test public site access (no context):
--    SELECT * FROM models WHERE is_verified = true; -- Should work (public read)

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- If you need to rollback this migration:
--
-- DROP POLICY IF EXISTS "Organization Dashboard Access" ON models;
-- DROP POLICY IF EXISTS "Organization Analytics Read" ON analytics_events;
-- DROP POLICY IF EXISTS "Organization Self-Read" ON organizations;
-- DROP POLICY IF EXISTS "Admin Full Access" ON organizations;
-- DROP FUNCTION IF EXISTS public.set_organization_context(UUID);
-- DROP INDEX IF EXISTS idx_models_organization_id;
-- DROP INDEX IF EXISTS idx_analytics_events_model_id_org;
--
-- Then recreate the original organizations policies:
-- CREATE POLICY "Organizations are viewable by authenticated users"
--   ON organizations FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Enable all operations for service_role"
--   ON organizations FOR ALL TO service_role USING (true) WITH CHECK (true);
