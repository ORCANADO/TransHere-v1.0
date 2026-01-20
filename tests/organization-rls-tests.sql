-- ============================================
-- ORGANIZATION RLS TEST QUERIES
-- ============================================
-- Purpose: Verify Row Level Security policies are working correctly
--          and organizations cannot access each other's data.
--
-- Prerequisites:
-- 1. Run migration 018_organization_rls_policies.sql
-- 2. Have at least 2 organizations with assigned models
-- 3. Have analytics events for those models
-- ============================================

-- ============================================
-- SETUP: Get Organization UUIDs
-- ============================================
-- Replace these with actual UUIDs from your database

-- Get all organizations
SELECT id, name, api_key FROM organizations ORDER BY created_at;

-- For testing, we'll use:
-- Organization A: Replace with actual UUID
-- Organization B: Replace with actual UUID
-- \set org_a_id 'your-org-a-uuid-here'
-- \set org_b_id 'your-org-b-uuid-here'

-- ============================================
-- TEST 1: Organization Context Setting
-- ============================================
-- Verify the context function works

-- Set context for Organization A
SELECT set_organization_context('org-a-uuid-here');

-- Verify context is set
SELECT current_setting('app.current_organization_id', true) AS current_org_id;
-- Expected: Returns 'org-a-uuid-here'

-- ============================================
-- TEST 2: Cross-Organization Access Prevention
-- ============================================
-- Verify Organization A cannot see Organization B's models

-- Set context for Organization A
SELECT set_organization_context('org-a-uuid-here');

-- Try to read Organization B's models
SELECT id, name, organization_id 
FROM models 
WHERE organization_id = 'org-b-uuid-here';
-- Expected: Returns 0 rows (access denied by RLS)

-- Read own models (should work)
SELECT id, name, organization_id 
FROM models 
WHERE organization_id = 'org-a-uuid-here';
-- Expected: Returns Organization A's models

-- ============================================
-- TEST 3: Analytics Filtering
-- ============================================
-- Verify analytics are filtered by organization's models

-- Set context for Organization A
SELECT set_organization_context('org-a-uuid-here');

-- Get Organization A's model IDs
SELECT id FROM models WHERE organization_id = 'org-a-uuid-here';

-- Fetch analytics (should only return events for Org A's models)
SELECT COUNT(*) AS org_a_analytics_count
FROM analytics_events;
-- Expected: Count of events for Organization A's models only

-- Try to access all analytics (RLS should filter)
SELECT event_type, model_id, country
FROM analytics_events
LIMIT 10;
-- Expected: Only events for Organization A's models

-- ============================================
-- TEST 4: Public Site Access (No Context)
-- ============================================
-- Verify public site can still read all models

-- Clear context (simulate public site)
-- Note: In a new session, context is not set by default

-- Public site should see all models
SELECT COUNT(*) AS public_visible_models
FROM models
WHERE is_verified = true;
-- Expected: All verified models visible (public read access)

-- ============================================
-- TEST 5: Organization Self-Read
-- ============================================
-- Verify organization can only read their own record

-- Set context for Organization A
SELECT set_organization_context('org-a-uuid-here');

-- Read own organization record
SELECT id, name, created_at
FROM organizations
WHERE id = 'org-a-uuid-here';
-- Expected: Returns Organization A's record

-- Try to read Organization B's record
SELECT id, name, created_at
FROM organizations
WHERE id = 'org-b-uuid-here';
-- Expected: Returns 0 rows (RLS blocks access)

-- ============================================
-- TEST 6: Admin Bypass (Service Role)
-- ============================================
-- Verify service_role bypasses RLS

-- Note: This test requires service_role credentials
-- Run this via Supabase Dashboard or with service_role key

-- As service_role, should see all organizations
SELECT COUNT(*) AS total_organizations FROM organizations;
-- Expected: All organizations visible

-- As service_role, should see all models
SELECT COUNT(*) AS total_models FROM models;
-- Expected: All models visible

-- ============================================
-- TEST 7: Unassigned Models
-- ============================================
-- Verify unassigned models (organization_id = NULL) are handled correctly

-- Set context for Organization A
SELECT set_organization_context('org-a-uuid-here');

-- Try to read unassigned models
SELECT id, name, organization_id
FROM models
WHERE organization_id IS NULL;
-- Expected: Returns 0 rows (organizations cannot see unassigned models)

-- As admin (service_role), should see unassigned models
-- SELECT id, name, organization_id FROM models WHERE organization_id IS NULL;
-- Expected: Returns unassigned models (admin can see all)

-- ============================================
-- TEST 8: Context Isolation Between Transactions
-- ============================================
-- Verify context is transaction-local

-- Transaction 1: Set context for Organization A
BEGIN;
SELECT set_organization_context('org-a-uuid-here');
SELECT current_setting('app.current_organization_id', true) AS tx1_context;
-- Expected: Returns 'org-a-uuid-here'
COMMIT;

-- Transaction 2: Context should be cleared
BEGIN;
SELECT current_setting('app.current_organization_id', true) AS tx2_context;
-- Expected: Returns empty string or error (context cleared)
COMMIT;

-- ============================================
-- TEST 9: Analytics Country Breakdown
-- ============================================
-- Verify analytics aggregations respect RLS

-- Set context for Organization A
SELECT set_organization_context('org-a-uuid-here');

-- Get country breakdown (should only include Org A's data)
SELECT 
  country,
  COUNT(*) FILTER (WHERE event_type = 'view') AS views,
  COUNT(*) FILTER (WHERE event_type IN ('click_social', 'click_content')) AS clicks
FROM analytics_events
WHERE country IS NOT NULL
GROUP BY country
ORDER BY views DESC
LIMIT 10;
-- Expected: Country breakdown for Organization A's models only

-- ============================================
-- TEST 10: Model Assignment Verification
-- ============================================
-- Verify models are correctly assigned to organizations

-- Check model assignments
SELECT 
  o.name AS organization_name,
  COUNT(m.id) AS model_count
FROM organizations o
LEFT JOIN models m ON m.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY model_count DESC;
-- Expected: Shows model count per organization

-- ============================================
-- CLEANUP
-- ============================================
-- Clear any test data if needed

-- Note: Context is automatically cleared when transaction ends
-- No manual cleanup required for context

-- ============================================
-- EXPECTED RESULTS SUMMARY
-- ============================================
-- ✅ TEST 1: Context setting works
-- ✅ TEST 2: Cross-organization access blocked
-- ✅ TEST 3: Analytics filtered by organization
-- ✅ TEST 4: Public site access unchanged
-- ✅ TEST 5: Organization self-read only
-- ✅ TEST 6: Admin bypasses RLS
-- ✅ TEST 7: Unassigned models not visible to orgs
-- ✅ TEST 8: Context is transaction-local
-- ✅ TEST 9: Analytics aggregations respect RLS
-- ✅ TEST 10: Model assignments verified

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- If tests fail, check:
-- 1. Migration 018 has been run
-- 2. RLS is enabled on tables: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- 3. Policies exist: SELECT * FROM pg_policies WHERE tablename IN ('models', 'analytics_events', 'organizations');
-- 4. Organization IDs are correct
-- 5. Models are assigned to organizations
