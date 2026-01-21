-- Migration: 028_expand_tracking_links_for_organizations
-- Purpose: Add organization scoping and destination URLs to tracking links, and add click tracking details.

-- 1. Expand tracking_links table
DO $$ 
BEGIN
  -- Add organization_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_links' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE tracking_links ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add name column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_links' AND column_name = 'name'
  ) THEN
    ALTER TABLE tracking_links ADD COLUMN name VARCHAR(255);
  END IF;

  -- Add destination_url column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_links' AND column_name = 'destination_url'
  ) THEN
    ALTER TABLE tracking_links ADD COLUMN destination_url TEXT;
  END IF;

  -- Add updated_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_links' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE tracking_links ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Make model_id and source_id optional to support non-model or direct org links
  ALTER TABLE tracking_links ALTER COLUMN model_id DROP NOT NULL;
  ALTER TABLE tracking_links ALTER COLUMN source_id DROP NOT NULL;
END $$;

-- 2. Create tracking_link_clicks table for detailed logging
CREATE TABLE IF NOT EXISTS tracking_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_link_id UUID REFERENCES tracking_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  country VARCHAR(10),
  city VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_tracking_clicks_link ON tracking_link_clicks(tracking_link_id);
CREATE INDEX IF NOT EXISTS idx_tracking_clicks_date ON tracking_link_clicks(clicked_at);

-- 3. Update increment function (idempotent replacement)
CREATE OR REPLACE FUNCTION increment_tracking_link_clicks(link_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tracking_links 
  SET click_count = COALESCE(click_count, 0) + 1,
      updated_at = NOW()
  WHERE id = link_id;
END;
$$;

-- 4. RLS Policies for Organizations
-- Using the organization context pattern established in 018
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_link_clicks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they might conflict
DROP POLICY IF EXISTS "Organizations can view own tracking links" ON tracking_links;
DROP POLICY IF EXISTS "Organizations can manage own tracking links" ON tracking_links;

CREATE POLICY "Organizations can manage own tracking links"
  ON tracking_links
  FOR ALL
  TO authenticated
  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  )
  WITH CHECK (
    organization_id = current_setting('app.current_organization_id', true)::uuid
  );

CREATE POLICY "Organizations can view own click data"
  ON tracking_link_clicks
  FOR SELECT
  TO authenticated
  USING (
    tracking_link_id IN (
      SELECT id FROM tracking_links 
      WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
    )
  );

-- Also allow public insert for analytics logging
CREATE POLICY "Public can log tracking clicks"
  ON tracking_link_clicks
  FOR INSERT
  WITH CHECK (true);

-- 5. Indexes for organization queries
CREATE INDEX IF NOT EXISTS idx_tracking_links_org ON tracking_links(organization_id);
