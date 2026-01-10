-- Migration: Create gallery_items table for Hybrid Video support
-- This replaces the simple TEXT[] gallery_urls column with a proper table
-- supporting video files, posters, and metadata

-- ============================================
-- 1. CREATE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  poster_url TEXT, -- Nullable: Only used for videos (the cover/thumbnail)
  width INTEGER, -- Nullable: For aspect ratio / layout optimization
  height INTEGER, -- Nullable: For aspect ratio / layout optimization
  sort_order INTEGER DEFAULT 0, -- For manual ordering in gallery
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================
-- Fast lookups by model_id (the primary query pattern)
CREATE INDEX IF NOT EXISTS idx_gallery_items_model_id ON gallery_items(model_id);

-- Sort order index for ordered retrieval
CREATE INDEX IF NOT EXISTS idx_gallery_items_sort_order ON gallery_items(model_id, sort_order);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read Access
-- Allows anonymous and authenticated users to SELECT all gallery items
CREATE POLICY "Public Read Access"
  ON gallery_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Admin Full Access
-- Only allows service_role to INSERT, UPDATE, or DELETE rows
CREATE POLICY "Admin Full Access"
  ON gallery_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. DATA MIGRATION
-- Migrate existing data from models.gallery_urls to gallery_items
-- All existing URLs are assumed to be images
-- ============================================
DO $$
DECLARE
  model_record RECORD;
  url_item TEXT;
  url_index INTEGER;
BEGIN
  -- Loop through all models that have gallery_urls
  FOR model_record IN 
    SELECT id, gallery_urls 
    FROM models 
    WHERE gallery_urls IS NOT NULL 
      AND array_length(gallery_urls, 1) > 0
  LOOP
    -- Reset index for each model
    url_index := 0;
    
    -- Loop through each URL in the gallery_urls array
    FOREACH url_item IN ARRAY model_record.gallery_urls
    LOOP
      -- Skip empty strings
      IF url_item IS NOT NULL AND url_item <> '' THEN
        -- Insert into gallery_items as type 'image'
        INSERT INTO gallery_items (model_id, media_url, media_type, sort_order)
        VALUES (model_record.id, url_item, 'image', url_index);
        
        url_index := url_index + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Migration complete: Existing gallery_urls have been migrated to gallery_items';
END $$;

-- ============================================
-- 5. OPTIONAL: Add comment for documentation
-- ============================================
COMMENT ON TABLE gallery_items IS 'Stores gallery media (images and videos) for model profiles. Supports hybrid video with poster images.';
COMMENT ON COLUMN gallery_items.media_url IS 'Primary media URL. For videos, this should be the MP4 file path.';
COMMENT ON COLUMN gallery_items.poster_url IS 'Poster/thumbnail image for videos. Null for images.';
COMMENT ON COLUMN gallery_items.sort_order IS 'Manual ordering within a model gallery. Lower numbers appear first.';
