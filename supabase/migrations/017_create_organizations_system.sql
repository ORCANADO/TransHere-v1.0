-- Migration: 017 Create Organizations System
-- Description: Implements a multi-tenant organization system to group models and analytics.
-- Created: 2026-01-20

/*
  SUMMARY OF CHANGES:
  1. CREATE TABLE `organizations`: Stores organization metadata and API keys for authentication.
  2. ALTER TABLE `models`: Adds `organization_id` to link models to an organization.
  3. TRIGGER `on_organization_updated`: Ensures `updated_at` is always current.
  4. DEFAULT DATA: Inserts 'Default Organization' and links all existing models to it for backward compatibility.
  5. RLS POLICIES: 
     - Organizations: SELECT allowed for authenticated users via API key logic.
     - Organizations: Full access for service_role.
*/

-- 1. Create the 'organizations' table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Create the trigger for organizations
CREATE TRIGGER on_organization_updated
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Alter 'models' table to include organization_id
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_models_organization_id ON models(organization_id);

-- 6. Insert 'Default Organization'
INSERT INTO organizations (name)
VALUES ('Default Organization')
ON CONFLICT (name) DO NOTHING;

-- 7. Backfill existing models to the Default Organization
UPDATE models 
SET organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization')
WHERE organization_id IS NULL;

-- 8. Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for organizations
-- SELECT allowed for ANY authenticated user (simplified for this migration, 
-- usually you'd check headers or JWT claims for the API key in a production edge function)
CREATE POLICY "Public Read Organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- Full access for service_role
CREATE POLICY "Service Role Full Access"
  ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

/*
-- ROLLBACK SQL --
DROP TRIGGER IF EXISTS on_organization_updated ON organizations;
DROP FUNCTION IF EXISTS update_updated_at_column();
ALTER TABLE models DROP COLUMN IF EXISTS organization_id;
DROP TABLE IF EXISTS organizations;
*/
