-- Migration: Auto-update last_story_added_at when stories are created
-- This ensures models automatically jump to the front when new stories are added

-- Function to update the model's last_story_added_at timestamp
CREATE OR REPLACE FUNCTION update_last_story_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the models table's last_story_added_at column
  -- Join through story_groups to get the model_id
  UPDATE public.models
  SET last_story_added_at = NOW()
  WHERE id = (
    SELECT model_id 
    FROM public.story_groups 
    WHERE id = NEW.group_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that fires AFTER INSERT on stories table
CREATE TRIGGER on_story_created
AFTER INSERT ON public.stories
FOR EACH ROW
EXECUTE FUNCTION update_last_story_timestamp();

-- Add comment for documentation
COMMENT ON FUNCTION update_last_story_timestamp() IS 'Automatically updates the models.last_story_added_at timestamp when a new story is inserted';
