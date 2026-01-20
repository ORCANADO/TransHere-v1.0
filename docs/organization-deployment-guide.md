# Organization System Deployment Guide

This guide provides step-by-step instructions for deploying the organization system to production.

## A. Pre-Deployment Checklist

Complete all items before proceeding with deployment:

- [ ] **All migrations tested on staging database**
  - Run migrations 017 and 018 on staging
  - Verify no errors or warnings
  - Test rollback script works correctly

- [ ] **Environment variables documented**
  - No new environment variables required
  - Existing vars: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_KEY`
  - Verify all vars are set in Cloudflare Pages

- [ ] **Admin API key secured**
  - Document where admin key is stored (password manager, secrets vault)
  - Ensure only authorized personnel have access
  - Consider rotating key after deployment

- [ ] **Code review completed**
  - All PRs reviewed and approved
  - No merge conflicts
  - Tests passing in CI/CD (if applicable)

- [ ] **Git branch merged to main**
  - Feature branch merged to `main`
  - All commits pushed to remote
  - Tags created for release (optional: `v1.1.0-organizations`)

## B. Deployment Steps

### Step 1: Run Database Migrations

**1.1. Access Supabase Dashboard**
- Navigate to: https://supabase.com/dashboard
- Select your project
- Go to: Database → SQL Editor

**1.2. Execute Migration 017**
```sql
-- Copy contents of supabase/migrations/017_create_organizations_system.sql
-- Paste into SQL Editor
-- Click "Run"
```

**Expected Output:**
- Organizations table created
- Models table altered (organization_id column added)
- Default organization created
- Existing models assigned to default organization

**1.3. Verify Migration 017**
```sql
-- Check organizations table
SELECT * FROM organizations;
-- Expected: 1 row (Default Organization)

-- Check models have organization_id
SELECT COUNT(*) FROM models WHERE organization_id IS NOT NULL;
-- Expected: Count of all existing models
```

**1.4. Execute Migration 018**
```sql
-- Copy contents of supabase/migrations/018_organization_rls_policies.sql
-- Paste into SQL Editor
-- Click "Run"
```

**Expected Output:**
- `set_organization_context` function created
- RLS policies created on models, analytics_events, organizations tables
- Indexes created on organization_id columns

**1.5. Verify Migration 018**
```sql
-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('models', 'analytics_events', 'organizations');
-- Expected: 6 policies total

-- Check function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'set_organization_context';
-- Expected: 1 row
```

### Step 2: Deploy Next.js Application

**2.1. Push to Git**
```bash
# Ensure all changes are committed
git status

# Push to main branch
git push origin main
```

**2.2. Monitor Cloudflare Pages Build**
- Navigate to: Cloudflare Dashboard → Pages → Your Project
- Watch build logs for errors
- Expected build time: ~3 minutes

**2.3. Verify Build Success**
- Build status: ✅ Success
- Deployment URL: https://your-project.pages.dev

**2.4. Verify Main Site Loads**
- Navigate to: https://your-domain.com/
- Expected: Model feed loads normally
- Verify: No console errors

**2.5. Verify Admin Dashboard Loads**
- Navigate to: https://your-domain.com/admin?key=<admin_key>
- Expected: Admin dashboard loads
- Verify: New "Organizations" tab visible

### Step 3: Create First Organization

**3.1. Access Admin Dashboard**
- URL: `/admin?key=<admin_key>`
- Click: "Organizations" tab

**3.2. Create Organization**
- Click: "Create Organization" button
- Enter name: e.g., "Agency Alpha"
- Click: "Create Organization"

**3.3. Save API Key**
- **CRITICAL**: Copy the generated API key immediately
- Store in password manager or secure location
- This is the only time the full key will be shown

**3.4. Verify Organization Created**
- Organization appears in table
- Model count shows 0
- Created date is current

### Step 4: Assign Models to Organization

**4.1. Navigate to Models Tab**
- In admin dashboard, click "Analytics" tab
- Models are listed in sidebar

**4.2. Assign Models (if available)**
- Note: Model assignment dialog may need to be added to model actions
- Alternative: Use SQL to assign models:
  ```sql
  UPDATE models 
  SET organization_id = '<org-id>' 
  WHERE id IN ('<model-id-1>', '<model-id-2>');
  ```

**4.3. Verify Assignment**
```sql
SELECT m.name, o.name AS organization_name
FROM models m
LEFT JOIN organizations o ON m.organization_id = o.id
WHERE m.organization_id = '<org-id>';
```

### Step 5: Test Organization Dashboard

**5.1. Access Organization Dashboard**
- URL: `/org?key=<org_api_key>`
- Expected: Dashboard loads successfully

**5.2. Verify Data Display**
- Organization name displays correctly
- Assigned models appear in models grid
- Analytics stats show (may be 0 if no recent activity)

**5.3. Test Security**
- Try invalid API key: `/org?key=invalid`
- Expected: Redirects to `/org/unauthorized`

**5.4. Test Analytics Filtering**
- Change date range using date picker
- Verify: Stats update to reflect new range

## C. Post-Deployment Validation

Complete all validation steps:

- [ ] **Main site (/) loads without errors**
  - Model feed displays
  - No console errors
  - Images load correctly

- [ ] **Admin dashboard (/admin) works**
  - All tabs accessible
  - Organizations tab shows created orgs
  - Can create new organizations

- [ ] **Organization dashboard (/org) validates API keys**
  - Valid key: Dashboard loads
  - Invalid key: Redirects to unauthorized
  - No data leakage on error

- [ ] **Analytics data filters correctly by organization**
  - Organization A sees only their data
  - Organization B sees only their data
  - No cross-organization data visible

- [ ] **Model assignment updates reflected in real-time**
  - Assign model to org
  - Refresh org dashboard
  - Model appears in list

## D. Rollback Procedure

If critical issues are discovered post-deployment:

### When to Rollback
- Database errors preventing site functionality
- Data leakage between organizations
- RLS policies blocking legitimate access
- Critical security vulnerability discovered

### Rollback Steps

**1. Execute Rollback SQL Script**
```sql
-- In Supabase Dashboard → SQL Editor
-- Copy contents of supabase/migrations/rollback/rollback-017-018.sql
-- Paste and execute
```

**2. Verify Rollback Success**
```sql
-- Organizations table should not exist
SELECT * FROM organizations;
-- Expected: ERROR: relation "organizations" does not exist

-- Models should not have organization_id
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'models' AND column_name = 'organization_id';
-- Expected: 0 rows
```

**3. Revert Next.js Deployment**
```bash
# Find previous working commit
git log --oneline

# Revert to previous version
git revert <commit-hash>
git push origin main

# Or rollback via Cloudflare Pages dashboard
# Deployments → Previous Deployment → Rollback
```

**4. Verify Application Works**
- Main site loads: `/`
- Admin dashboard loads: `/admin?key=<admin_key>`
- No organization-related errors

**5. Notify Stakeholders**
- Email team about rollback
- Document issue in post-mortem
- Create plan for fix and redeployment

## E. Troubleshooting

### Issue: Migration 017 fails with "column already exists"
**Solution**: organization_id column may already exist. Check with:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'models' AND column_name = 'organization_id';
```
If exists, skip the ALTER TABLE step in migration 017.

### Issue: RLS policies prevent admin access
**Solution**: Verify service_role key is being used:
```sql
-- Check current role
SELECT current_user;
-- Should be: service_role (when using service_role key)
```

### Issue: Organization dashboard shows "Access Denied"
**Solution**: 
1. Verify API key is correct
2. Check organization exists in database
3. Verify RLS policies are active

### Issue: Models not appearing in organization dashboard
**Solution**:
1. Verify models are assigned: `SELECT * FROM models WHERE organization_id = '<org-id>'`
2. Check RLS context is being set in `organization-auth.ts`
3. Verify `set_organization_context` function exists

## F. Post-Deployment Monitoring

Monitor these metrics for 24-48 hours after deployment:

- **Error Rates**: Watch for increased 500/401 errors
- **Performance**: Monitor page load times for `/org` routes
- **Database Load**: Check query performance on models/analytics tables
- **User Reports**: Monitor support channels for issues

## G. Success Criteria

Deployment is considered successful when:

✅ All migrations executed without errors  
✅ Main site functionality unchanged  
✅ Admin dashboard can manage organizations  
✅ Organization dashboards load correctly  
✅ RLS policies enforce data isolation  
✅ No critical errors in logs  
✅ Performance metrics within acceptable range  

## H. Next Steps After Deployment

1. **Create Organizations for Clients**
   - Use admin dashboard to create organizations
   - Securely share API keys with clients

2. **Assign Models to Organizations**
   - Bulk assign existing models
   - Update model creation workflow to include organization

3. **Monitor Usage**
   - Track organization dashboard access
   - Gather feedback from clients

4. **Documentation**
   - Share user guide with organization owners
   - Train support team on organization features

5. **Iterate**
   - Collect feature requests
   - Plan enhancements for v1.2
