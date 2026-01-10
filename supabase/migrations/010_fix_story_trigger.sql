-- Migration: Fix story trigger to ignore pinned groups
-- Only unpinned (Recent/Daily) stories should update last_story_added_at
-- Pinned stories (like "Mexico Trip") should NOT bump the model to home page

-- Replace the existing function with updated logic
CREATE OR REPLACE FUNCTION update_last_story_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the story group is pinned
  -- Only update timestamp for unpinned (Recent/Daily) stories
  IF (SELECT is_pinned FROM public.story_groups WHERE id = NEW.group_id) = false THEN
    -- Update the models table's last_story_added_at column
    UPDATE public.models
    SET last_story_added_at = NOW()
    WHERE id = (
      SELECT model_id 
      FROM public.story_groups 
      WHERE id = NEW.group_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update comment for documentation
COMMENT ON FUNCTION update_last_story_timestamp() IS 'Automatically updates the models.last_story_added_at timestamp when a new unpinned (Recent) story is inserted. Pinned stories are ignored.';
