-- Migration: Drop legacy gallery_urls column from models table
-- This column has been replaced by the gallery_items table (see migration 011)
-- All existing data was migrated to gallery_items in the previous migration

-- ============================================
-- 1. DROP COLUMN
-- ============================================
-- Remove the legacy gallery_urls TEXT[] column
-- Using IF EXISTS to prevent errors if column was already dropped
ALTER TABLE public.models 
DROP COLUMN IF EXISTS gallery_urls;

-- ============================================
-- 2. VERIFICATION NOTES
-- ============================================
-- Note: This migration only removes the database column.
-- Code references to gallery_urls still exist in:
--   - src/app/model/[slug]/page.tsx (SELECT query and fallback logic)
--   - src/app/page.tsx (SELECT query and data mapping)
--   - src/types/index.ts (Model interface)
-- These should be cleaned up in a separate code refactor after this migration is applied.
