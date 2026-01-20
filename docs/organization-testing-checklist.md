# Organization System Testing Checklist

This comprehensive checklist ensures all organization system features are working correctly before production deployment.

## A. Database Tests

- [ ] **Organizations table exists with correct schema**
  ```sql
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'organizations';
  -- Expected: id (uuid), name (text), api_key (uuid), created_at, updated_at
  ```

- [ ] **Models table has organization_id foreign key**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'models' AND column_name = 'organization_id';
  -- Expected: organization_id (uuid, nullable)
  ```

- [ ] **Default organization created and assigned to existing models**
  ```sql
  SELECT name FROM organizations WHERE name = 'Default Organization';
  SELECT COUNT(*) FROM models WHERE organization_id IS NOT NULL;
  ```

- [ ] **RLS policies enabled on all relevant tables**
  ```sql
  SELECT tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename IN ('models', 'analytics_events', 'organizations');
  -- Expected: All should have rowsecurity = true
  ```

- [ ] **Indexes created on organization_id columns**
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename IN ('models', 'analytics_events') 
    AND indexname LIKE '%organization%';
  ```

- [ ] **Cascade behavior: Deleting organization sets models.organization_id to NULL**
  ```sql
  -- Test in staging only!
  -- INSERT INTO organizations (name) VALUES ('Test Org') RETURNING id;
  -- UPDATE models SET organization_id = '<test-org-id>' WHERE id = '<test-model-id>';
  -- DELETE FROM organizations WHERE id = '<test-org-id>';
  -- SELECT organization_id FROM models WHERE id = '<test-model-id>';
  -- Expected: organization_id should be NULL
  ```

## B. API Route Tests

- [ ] **POST /api/admin/organizations - Creates organization with valid API key**
  - URL: `/api/admin/organizations?key=<admin_key>`
  - Body: `{ "name": "Test Organization" }`
  - Expected: 200 OK, returns organization with generated UUID api_key

- [ ] **GET /api/admin/organizations - Returns all organizations with model counts**
  - URL: `/api/admin/organizations?key=<admin_key>`
  - Expected: 200 OK, array of organizations with `model_count` field

- [ ] **PUT /api/admin/organizations/[id] - Updates organization name**
  - URL: `/api/admin/organizations/<org-id>?key=<admin_key>`
  - Body: `{ "name": "Updated Name" }`
  - Expected: 200 OK, organization name updated

- [ ] **PUT /api/admin/organizations/[id] - Regenerates API key**
  - URL: `/api/admin/organizations/<org-id>?key=<admin_key>`
  - Body: `{ "regenerate_key": true }`
  - Expected: 200 OK, new api_key returned, old key invalidated

- [ ] **DELETE /api/admin/organizations/[id] - Prevents deletion if models assigned**
  - URL: `/api/admin/organizations/<org-id-with-models>?key=<admin_key>`
  - Expected: 400 Bad Request, error message about assigned models

- [ ] **POST /api/admin/models/assign - Assigns model to organization**
  - URL: `/api/admin/models/assign?key=<admin_key>`
  - Body: `{ "model_id": "<model-id>", "organization_id": "<org-id>" }`
  - Expected: 200 OK, model assigned

- [ ] **POST /api/admin/models/assign - Unassigns model (null organization_id)**
  - URL: `/api/admin/models/assign?key=<admin_key>`
  - Body: `{ "model_id": "<model-id>", "organization_id": null }`
  - Expected: 200 OK, model unassigned

## C. Dashboard Tests

- [ ] **/org?key=invalid returns unauthorized page**
  - Navigate to: `/org?key=invalid-key-12345`
  - Expected: Redirects to `/org/unauthorized`, shows lock icon and error message

- [ ] **/org?key=valid loads organization dashboard**
  - Navigate to: `/org?key=<valid-org-api-key>`
  - Expected: Dashboard loads, shows organization name and stats

- [ ] **Dashboard shows only organization's models**
  - Verify: Model list matches organization's assigned models
  - Verify: No models from other organizations visible

- [ ] **Analytics stats filtered correctly by organization**
  - Verify: Total views/clicks match organization's models only
  - Verify: Top models list only includes organization's models

- [ ] **Date range picker updates analytics data**
  - Change date range to last 7 days
  - Verify: Stats update to reflect new date range

- [ ] **API key copy button works**
  - Click copy button in organization header
  - Verify: API key copied to clipboard (paste to verify)

- [ ] **"View Dashboard" link from admin opens correct org dashboard**
  - In admin → Organizations tab, click "View Dashboard" icon
  - Verify: Opens `/org?key=<correct-api-key>` in new tab

## D. Security Tests

- [ ] **Organization A cannot access Organization B's data via API**
  ```sql
  -- Set context for Org A
  SELECT set_organization_context('<org-a-id>');
  -- Try to query Org B's models
  SELECT * FROM models WHERE organization_id = '<org-b-id>';
  -- Expected: Returns 0 rows (RLS blocks access)
  ```

- [ ] **Invalid API key returns 401 (not 500 or data leak)**
  - Navigate to: `/org?key=completely-invalid-key`
  - Expected: HTTP 401 or redirect to unauthorized, no data exposed

- [ ] **Public site feed still loads (RLS doesn't block main site)**
  - Navigate to: `/` (main site)
  - Expected: Model feed loads normally, all verified models visible

- [ ] **Admin dashboard can manage all organizations**
  - Navigate to: `/admin?key=<admin_key>`
  - Expected: Can view, create, edit, delete organizations

- [ ] **SQL injection attempts blocked by Supabase**
  - Try: `/org?key=' OR '1'='1`
  - Expected: Treated as invalid key, no SQL injection

## E. UI/UX Tests

- [ ] **Organization manager table displays correctly**
  - Columns: Name, API Key (masked), Model Count, Created Date, Actions
  - Verify: All data displays correctly, no layout issues

- [ ] **Create organization modal validates input**
  - Try: Empty name → Should show validation error
  - Try: Name > 100 chars → Should show validation error
  - Try: Valid name → Should create successfully

- [ ] **Edit organization modal shows current values**
  - Click edit on an organization
  - Verify: Current name pre-filled in input

- [ ] **Model assignment dialog updates model list**
  - Assign model to organization
  - Verify: Model count increments in organizations table

- [ ] **Toast notifications show on success/error**
  - Create organization → Success toast
  - Try to delete org with models → Error toast

- [ ] **Loading states display during async operations**
  - Verify: Skeleton loaders show while fetching organizations
  - Verify: Button shows "Creating..." during creation

- [ ] **Responsive design works on mobile (organization dashboard)**
  - Test on mobile viewport (375px width)
  - Verify: Dashboard layout adapts, no horizontal scroll

## Test Results Summary

**Date Tested**: _______________  
**Tested By**: _______________  
**Environment**: [ ] Staging [ ] Production

**Results**:
- Total Tests: 40
- Passed: ___
- Failed: ___
- Skipped: ___

**Failed Tests** (if any):
1. _______________________________________
2. _______________________________________
3. _______________________________________

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________

**Deployment Recommendation**:
[ ] Ready for production deployment  
[ ] Requires fixes before deployment  
[ ] Needs further testing
