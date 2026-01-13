-- Migration: Add sort_order column to stories table for manual ordering
-- This allows drag-and-drop reordering of stories within a story group

-- Add sort_order column if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for efficient sorting queries
-- Index on (group_id, sort_order) for fast retrieval of ordered stories within a group
CREATE INDEX IF NOT EXISTS idx_stories_sort_order ON stories(group_id, sort_order);

-- Add comment for documentation
COMMENT ON COLUMN stories.sort_order IS 'Manual ordering for stories within a story group. Lower numbers appear first.';

-- Update existing stories to use posted_date as initial sort_order
-- This ensures existing stories maintain their chronological order
UPDATE stories 
SET sort_order = EXTRACT(EPOCH FROM posted_date)::INTEGER 
WHERE sort_order = 0;
