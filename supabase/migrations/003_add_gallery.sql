-- Add gallery_urls column to models table
-- This stores an array of image URLs for the Tinder-style gallery view
ALTER TABLE models ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';

