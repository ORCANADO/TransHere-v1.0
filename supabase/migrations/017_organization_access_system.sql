-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id to models table (nullable for backward compatibility)
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Organization users table (links auth users to organizations)
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Admin users table (users with full admin access)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster model queries by organization
CREATE INDEX IF NOT EXISTS idx_models_organization_id ON models(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Organizations: admins can see all, org users can see their own
CREATE POLICY "Admins can manage all organizations" ON organizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Org users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid())
  );

-- Organization users: admins can manage all, org owners can manage their org
CREATE POLICY "Admins can manage all org users" ON organization_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
