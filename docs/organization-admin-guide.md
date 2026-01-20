# Organization System - Admin Guide

This guide is for platform administrators managing organizations, models, and API keys.

## Organization Management

### Creating New Organizations

**When to create:**
- New client onboarding
- Agency partnerships
- Internal team divisions

**How to create:**

1. Access admin dashboard: `/admin?key=<admin_key>`
2. Navigate to "Organizations" tab
3. Click "Create Organization"
4. Enter organization name (max 100 characters)
5. Click "Create Organization"
6. **CRITICAL**: Copy the generated API key immediately
7. Securely share the key with the organization owner

**Best Practices:**
- Use descriptive names (e.g., "Agency Alpha", "Brand XYZ")
- Document which client each organization represents
- Store API keys in password manager or secrets vault
- Never share API keys via unsecured channels (email, Slack)

### Regenerating API Keys

**When to regenerate:**
- API key compromised or leaked
- Organization requests key rotation
- Security policy requires periodic rotation
- Suspected unauthorized access

**How to regenerate:**

1. In Organizations tab, click edit icon (pencil) for the organization
2. Check "Regenerate API Key" checkbox
3. Read the warning: "This will invalidate the current key"
4. Click "Save Changes"
5. **CRITICAL**: Copy the new API key immediately
6. Securely share with organization owner
7. Inform them the old key no longer works

**Important Notes:**
- Old key is invalidated immediately
- Organization will lose access until they update their bookmark
- Plan regeneration during off-hours if possible
- Notify organization in advance

### Deleting Organizations

**When to delete:**
- Client contract ended
- Organization no longer active
- Consolidating duplicate organizations

**Constraints:**
- Cannot delete organization with assigned models
- Must unassign all models first

**How to delete:**

1. Verify organization has 0 models assigned
2. If models assigned, unassign them first (see Model Assignment section)
3. Click delete icon (trash) for the organization
4. Confirm deletion in popup
5. Organization is permanently deleted

**What happens:**
- Organization record removed from database
- API key invalidated
- Dashboard URL no longer works
- Analytics data preserved (linked to model IDs)

## Model Assignment

### Assigning Models to Organizations

**Purpose:**
- Give organizations access to specific models
- Filter analytics by organization
- Manage model portfolios

**How to assign:**

**Option 1: Via Admin Dashboard (if implemented)**
1. Go to Models tab
2. Find the model to assign
3. Click "Assign Organization"
4. Select organization from dropdown
5. Click "Assign"

**Option 2: Via SQL**
```sql
UPDATE models 
SET organization_id = '<organization-uuid>' 
WHERE id = '<model-uuid>';
```

**Verification:**
```sql
SELECT m.name, o.name AS organization_name
FROM models m
LEFT JOIN organizations o ON m.organization_id = o.id
WHERE m.id = '<model-uuid>';
```

### Unassigning Models

**When to unassign:**
- Model contract ended with organization
- Transferring model to different organization
- Model becoming platform-managed (no organization)

**How to unassign:**

**Option 1: Via Admin Dashboard**
1. Open Model Assignment Dialog
2. Select "No Organization (Unassigned)"
3. Click "Assign"

**Option 2: Via SQL**
```sql
UPDATE models 
SET organization_id = NULL 
WHERE id = '<model-uuid>';
```

### Bulk Assignment Strategies

**Assigning multiple models to one organization:**

```sql
-- Assign specific models
UPDATE models 
SET organization_id = '<organization-uuid>' 
WHERE id IN (
  '<model-1-uuid>',
  '<model-2-uuid>',
  '<model-3-uuid>'
);

-- Assign all verified models
UPDATE models 
SET organization_id = '<organization-uuid>' 
WHERE is_verified = true AND organization_id IS NULL;

-- Assign models by tag
UPDATE models 
SET organization_id = '<organization-uuid>' 
WHERE 'specific-tag' = ANY(tags);
```

**Verification:**
```sql
SELECT COUNT(*) FROM models WHERE organization_id = '<organization-uuid>';
```

**Note on Organization Analytics:**
Organizations now have access to an enhanced dashboard including:
- **Interactive Filters**: Period, Country, Traffic Source, and Model selection.
- **Comparison View**: Automatic benchmarking when multiple models are selected.
- **Detail Panel**: Deep-dive performance metrics and regional breakdown for individual models.
- **Theme Support**: Professional Light and Dark modes.

## Security Considerations

### API Key Rotation Policy

**Recommended rotation schedule:**
- **High Security**: Every 90 days
- **Standard**: Every 180 days
- **On-Demand**: When compromised or requested

**Rotation Process:**
1. Schedule rotation during low-traffic period
2. Notify organization 24-48 hours in advance
3. Regenerate key via admin dashboard
4. Securely share new key
5. Verify organization can access dashboard
6. Document rotation in security log

### Monitoring Organization Access

**What to monitor:**
- Failed API key attempts (check middleware logs)
- Unusual access patterns (time, frequency)
- Geographic anomalies (unexpected countries)
- Data access patterns (excessive queries)

**Access Logs:**
```
[Organization Auth] Valid API key for organization: Agency Alpha
[Organization Auth] Invalid API key attempt: { error: 'Not found' }
```

**Red Flags:**
- Multiple failed attempts from same IP
- Access from unexpected geographic locations
- Sudden spike in API requests
- Access during unusual hours

### Responding to Security Incidents

**If API key compromised:**

1. **Immediate Actions:**
   - Regenerate API key immediately
   - Notify organization owner
   - Review access logs for suspicious activity
   - Document incident

2. **Investigation:**
   - Identify how key was compromised
   - Check for data exfiltration
   - Review affected time period
   - Assess damage

3. **Remediation:**
   - Issue new API key
   - Update security procedures
   - Train organization on security best practices
   - Consider additional security measures

4. **Post-Incident:**
   - Write post-mortem report
   - Update security policies
   - Implement preventive measures
   - Schedule follow-up review

## Database Maintenance

### Cleaning Up Orphaned Models

**Orphaned models**: Models with `organization_id` pointing to deleted organization

**Find orphaned models:**
```sql
SELECT m.id, m.name, m.organization_id
FROM models m
LEFT JOIN organizations o ON m.organization_id = o.id
WHERE m.organization_id IS NOT NULL AND o.id IS NULL;
```

**Fix orphaned models:**
```sql
-- Set to NULL (unassigned)
UPDATE models 
SET organization_id = NULL 
WHERE organization_id NOT IN (SELECT id FROM organizations);

-- Or assign to default organization
UPDATE models 
SET organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization')
WHERE organization_id NOT IN (SELECT id FROM organizations);
```

### Archiving Inactive Organizations

**Criteria for archiving:**
- No dashboard access in 90+ days
- No assigned models
- Client contract expired

**Archive process:**

1. **Backup data:**
```sql
-- Export organization data
COPY (
  SELECT * FROM organizations WHERE id = '<org-uuid>'
) TO '/path/to/backup/org-<name>-<date>.csv' CSV HEADER;
```

2. **Unassign models:**
```sql
UPDATE models SET organization_id = NULL WHERE organization_id = '<org-uuid>';
```

3. **Delete organization:**
```sql
DELETE FROM organizations WHERE id = '<org-uuid>';
```

4. **Document archival:**
- Record in admin log
- Note reason for archival
- Store backup securely

### Performance Optimization

**Monitor query performance:**

```sql
-- Check slow queries on models table
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%models%organization_id%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Optimize indexes:**

```sql
-- Verify indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'models' AND indexname LIKE '%organization%';

-- Rebuild index if needed
REINDEX INDEX idx_models_organization_id;
```

**Cache management:**

- `validateOrganizationKey`: 5-minute cache
- `getOrganizationModels`: 1-minute cache
- `getOrganizationAnalytics`: No cache (real-time)

**Clear cache if needed:**
```typescript
// In Next.js admin dashboard
revalidateTag('organization-auth');
revalidateTag('organization-models');
```

## Common Admin Tasks

### Task: Onboard New Client

1. Create organization
2. Copy and securely share API key
3. Assign models to organization
4. Verify dashboard access
5. Send user guide to client
6. Schedule follow-up check-in

### Task: Transfer Model Between Organizations

1. Unassign from current organization
2. Assign to new organization
3. Verify in both dashboards
4. Notify both organizations
5. Update internal records

### Task: Handle "Access Denied" Support Request

1. Verify organization exists
2. Check API key is correct
3. Test dashboard access yourself
4. If key invalid, regenerate and share
5. If issue persists, check RLS policies
6. Document resolution

### Task: Monthly Security Audit

1. Review all organizations
2. Check for inactive organizations
3. Verify model assignments
4. Review access logs
5. Identify any anomalies
6. Update security documentation

## Troubleshooting

### Issue: Organization can't access dashboard

**Diagnosis:**
1. Verify API key: `SELECT * FROM organizations WHERE api_key = '<key>'`
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'organizations'`
3. Test with service_role client

**Solution:**
- If key invalid: Regenerate
- If RLS issue: Check migration 018 applied
- If other: Check application logs

### Issue: Models not appearing in organization dashboard

**Diagnosis:**
1. Verify assignment: `SELECT * FROM models WHERE organization_id = '<org-id>'`
2. Check RLS context: Verify `set_organization_context` is called
3. Test query manually

**Solution:**
- If not assigned: Assign models
- If RLS issue: Verify function exists
- If cache issue: Clear cache

### Issue: Analytics showing incorrect data

**Diagnosis:**
1. Check date range parameters
2. Verify analytics events exist
3. Test aggregation query manually

**Solution:**
- Verify date format (ISO 8601)
- Check analytics_events table has data
- Review `getOrganizationAnalytics` function

## Best Practices

### Organization Naming

✅ **Good:**
- "Agency Alpha"
- "Brand XYZ Marketing"
- "Internal Team - Sales"

❌ **Avoid:**
- "test"
- "org1", "org2"
- Special characters or emojis

### API Key Management

- Store in password manager (1Password, LastPass)
- Never commit to Git
- Use secure channels for sharing (encrypted email, secure portal)
- Document key ownership
- Rotate regularly

### Model Assignment

- Document assignment rationale
- Keep assignments up to date
- Review quarterly
- Communicate changes to organizations

### Security

- Monitor access logs weekly
- Rotate keys on schedule
- Respond to incidents within 24 hours
- Document all security events
- Train organizations on best practices

---

**Admin Dashboard:**  
`https://transhere.vip/admin?key=<admin_key>`

**For Technical Issues:**  
Refer to `docs/organization-security.md` and `docs/organization-deployment-guide.md`
