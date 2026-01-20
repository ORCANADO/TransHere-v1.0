-- ============================================
-- ROLLBACK SCRIPT: Organization System (Migrations 017-018)
-- ============================================
-- Purpose: Safely rollback organization system if deployment fails
-- WARNING: This will delete all organization data and assignments!
-- 
-- BACKUP FIRST:
-- pg_dump -h <host> -U <user> -d <database> -t organizations -t models > backup.sql
-- ============================================

-- ============================================
-- STEP 1: Drop RLS Policies (Migration 018)
-- ============================================
-- Remove organization-specific RLS policies
-- Order: Drop policies before dropping functions they depend on

DROP POLICY IF EXISTS "Organization Dashboard Access" ON models;
DROP POLICY IF EXISTS "Organization Analytics Read" ON analytics_events;
DROP POLICY IF EXISTS "Organization Self-Read" ON organizations;
DROP POLICY IF EXISTS "Admin Full Access" ON organizations;

COMMENT ON TABLE models IS 'RLS policies for organization access removed';
COMMENT ON TABLE analytics_events IS 'RLS policies for organization access removed';

-- ============================================
-- STEP 2: Drop Organization Context Function
-- ============================================
-- Remove the function used to set organization context

DROP FUNCTION IF EXISTS public.set_organization_context(UUID);

-- ============================================
-- STEP 3: Drop Indexes (Migration 018)
-- ============================================
-- Remove performance indexes on organization_id

DROP INDEX IF EXISTS idx_models_organization_id;
DROP INDEX IF EXISTS idx_analytics_events_model_id_org;

-- ============================================
-- STEP 4: Remove organization_id from Models Table (Migration 017)
-- ============================================
-- WARNING: This removes all model-organization assignments!

ALTER TABLE models DROP COLUMN IF EXISTS organization_id;

COMMENT ON TABLE models IS 'organization_id column removed';

-- ============================================
-- STEP 5: Drop Organizations Table (Migration 017)
-- ============================================
-- WARNING: This deletes all organization records!

DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================
-- STEP 6: Drop Triggers and Functions (Migration 017)
-- ============================================
-- Remove updated_at trigger and function

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- STEP 7: Restore Original Organizations Policies (if needed)
-- ============================================
-- If organizations table existed before, restore original policies
-- Skip this step if organizations table was new in migration 017

-- Uncomment if restoring previous organizations table:
-- CREATE POLICY "Organizations are viewable by authenticated users"
--   ON organizations FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Enable all operations for service_role"
--   ON organizations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify rollback was successful:

-- 1. Verify organizations table is gone
-- SELECT * FROM organizations;
-- Expected: ERROR: relation "organizations" does not exist

-- 2. Verify models table has no organization_id column
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'models' AND column_name = 'organization_id';
-- Expected: 0 rows

-- 3. Verify RLS policies removed
-- SELECT policyname FROM pg_policies 
-- WHERE tablename IN ('models', 'analytics_events') 
--   AND policyname LIKE '%Organization%';
-- Expected: 0 rows

-- 4. Verify function removed
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_name = 'set_organization_context';
-- Expected: 0 rows

-- 5. Verify indexes removed
-- SELECT indexname FROM pg_indexes 
-- WHERE indexname IN ('idx_models_organization_id', 'idx_analytics_events_model_id_org');
-- Expected: 0 rows

-- ============================================
-- POST-ROLLBACK STEPS
-- ============================================
-- After running this rollback script:
--
-- 1. Verify application still works:
--    - Main site (/) loads
--    - Admin dashboard (/admin) works
--    - Model pages load correctly
--
-- 2. Revert Next.js code changes:
--    - git revert <commit-hash>
--    - git push origin main
--
-- 3. Redeploy application:
--    - Cloudflare Pages will auto-deploy on push
--    - Verify deployment successful
--
-- 4. Document the issue:
--    - Create post-mortem document
--    - Note what went wrong
--    - Plan fixes for next attempt
--
-- 5. Notify stakeholders:
--    - Inform team of rollback
--    - Provide timeline for fix
--    - Update project status

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================
-- Organization system has been completely removed.
-- Database is restored to pre-migration state.
