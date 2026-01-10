-- Migration: Add home stories flags
-- Add columns to track which models are featured in home stories section
ALTER TABLE public.models
ADD COLUMN featured_in_stories BOOLEAN DEFAULT false,
ADD COLUMN last_story_added_at TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN public.models.featured_in_stories IS 'Whether this model is featured in the home stories section';
COMMENT ON COLUMN public.models.last_story_added_at IS 'Timestamp of when the last story was added (for sorting/ordering)';

-- Create index for fast filtering on featured_in_stories
CREATE INDEX idx_models_featured_in_stories ON public.models(featured_in_stories) WHERE featured_in_stories = true;

-- RLS Policies
-- The existing "Public Models Read" policy should already allow SELECT for anon users
-- These columns are readable by default if the table has a SELECT policy for anon
-- No additional RLS changes needed if existing policy is "Enable read access for all users"
