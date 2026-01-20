# Organization Security - Row Level Security (RLS) Documentation

## Overview

TransHere.vip implements comprehensive Row Level Security (RLS) policies to ensure complete data isolation between organizations while maintaining public site functionality.

## Security Guarantees

✅ **Data Isolation**: Organization A cannot access Organization B's data  
✅ **Public Access**: Main site feed remains functional (public read access)  
✅ **Admin Access**: Service role bypasses RLS for management operations  
✅ **Context Required**: Organization queries require context to be set  
✅ **No Data Leakage**: Invalid API keys return 401, no data exposed  

## How Organization Context Works

### 1. Context Setting Function

```sql
CREATE FUNCTION public.set_organization_context(org_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_organization_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- **Purpose**: Sets organization ID in current transaction's config
- **Scope**: Transaction-local (automatically cleared after request)
- **Security**: SECURITY DEFINER allows non-superusers to call set_config

### 2. API Usage

Before fetching organization data, the API calls:

```typescript
await supabase.rpc('set_organization_context', { org_id: organizationId });
```

This sets the context that RLS policies use to filter data.

### 3. RLS Policy Enforcement

Once context is set, RLS policies automatically filter queries:

```sql
-- Models policy
USING (organization_id = current_setting('app.current_organization_id', true)::uuid)

-- Analytics policy
USING (model_id IN (
  SELECT id FROM models 
  WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
))
```

## RLS Policies

### Models Table

**Policy: Public Read Access** (unchanged)
- **Operation**: SELECT
- **Roles**: anon, authenticated
- **Condition**: `true` (all models visible to public)
- **Purpose**: Main site feed functionality

**Policy: Organization Dashboard Access** (new)
- **Operation**: SELECT
- **Roles**: authenticated
- **Condition**: `organization_id = current_setting('app.current_organization_id', true)::uuid`
- **Purpose**: Organization can only read their own models

**Policy: Admin Write Access** (unchanged)
- **Operation**: ALL
- **Roles**: service_role
- **Condition**: `true` (full access)
- **Purpose**: Admin dashboard CRUD operations

### Analytics Events Table

**Policy: Public Logger** (unchanged)
- **Operation**: INSERT
- **Roles**: anon
- **Condition**: `true` (anyone can log events)
- **Purpose**: Public analytics tracking

**Policy: Organization Analytics Read** (new)
- **Operation**: SELECT
- **Roles**: authenticated
- **Condition**: `model_id IN (SELECT id FROM models WHERE organization_id = current_setting(...))`
- **Purpose**: Filter analytics to organization's models only

### Organizations Table

**Policy: Organization Self-Read** (new)
- **Operation**: SELECT
- **Roles**: authenticated
- **Condition**: `id = current_setting('app.current_organization_id', true)::uuid`
- **Purpose**: Organization can only read their own record

**Policy: Admin Full Access** (new)
- **Operation**: ALL
- **Roles**: service_role
- **Condition**: `true` (full access)
- **Purpose**: Admin dashboard CRUD operations

## Data Access Matrix

| Role | Models | Analytics | Organizations |
|------|--------|-----------|---------------|
| **Public (anon)** | Read all | Insert only | None |
| **Organization (authenticated)** | Read own only | Read own only | Read self only |
| **Admin (service_role)** | Full CRUD | Full CRUD | Full CRUD |

## API Key Security Best Practices

### For Organizations

1. **Keep API Keys Private**: Never share your API key publicly
2. **Use HTTPS Only**: Always access dashboard over HTTPS
3. **Rotate Keys Regularly**: Request key regeneration if compromised
4. **Monitor Access**: Check dashboard regularly for unusual activity
5. **Secure Storage**: Store API keys in secure password managers

### For Administrators

1. **One-Time Display**: API keys shown only on creation/regeneration
2. **Secure Transmission**: Share keys via secure channels only
3. **Delete Protection**: Cannot delete organizations with assigned models
4. **Audit Trail**: Monitor organization access logs
5. **Service Role Key**: Never expose service_role key to clients

## Troubleshooting

### Error: "Could not find the setting 'app.current_organization_id'"

**Cause**: Organization context not set before query  
**Solution**: Ensure `set_organization_context()` is called before data queries

```typescript
// Correct
await supabase.rpc('set_organization_context', { org_id: organizationId });
const { data } = await supabase.from('models').select('*');

// Incorrect
const { data } = await supabase.from('models').select('*'); // Context not set!
```

### Error: "Row level security policy violated"

**Cause**: Trying to access data without proper context or permissions  
**Solution**: Verify organization context is set correctly

```sql
-- Check current context
SELECT current_setting('app.current_organization_id', true);

-- Should return the organization UUID
```

### Organization Cannot See Their Models

**Cause**: Models not assigned to organization  
**Solution**: Assign models via admin dashboard

```sql
-- Check model assignment
SELECT id, name, organization_id FROM models WHERE id = 'model-uuid';

-- Assign model to organization
UPDATE models SET organization_id = 'org-uuid' WHERE id = 'model-uuid';
```

### Public Site Not Loading Models

**Cause**: Public Read Access policy may be missing  
**Solution**: Verify policy exists

```sql
-- Check policies on models table
SELECT * FROM pg_policies WHERE tablename = 'models';

-- Should include "Public Read Access" policy
```

## Testing RLS Policies

See `tests/organization-rls-tests.sql` for comprehensive test queries.

### Quick Test

```sql
-- 1. Set context for Organization A
SELECT set_organization_context('org-a-uuid');

-- 2. Try to read Organization B's models (should return empty)
SELECT * FROM models WHERE organization_id = 'org-b-uuid';

-- 3. Read own models (should work)
SELECT * FROM models WHERE organization_id = 'org-a-uuid';
```

## Security Audit Checklist

- [ ] RLS enabled on all tables with sensitive data
- [ ] Public read access for main site functional
- [ ] Organization context set before all org queries
- [ ] No data leakage between organizations verified
- [ ] Admin service_role bypasses RLS (expected)
- [ ] Unassigned models only visible to admin
- [ ] API keys properly masked in admin UI
- [ ] Invalid API keys return 401 (no data leak)

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL set_config() Function](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET)
- Migration File: `supabase/migrations/018_organization_rls_policies.sql`
- Test Queries: `tests/organization-rls-tests.sql`
