-- Migration: Add engagement flags
alter table public.models
add column is_verified boolean default false,
add column is_new boolean default false;

-- Add comments for clarity
comment on column public.models.is_verified is 'Blue checkmark status';
comment on column public.models.is_new is 'New profile badge status';

-- Update RLS (Row Level Security)
-- No changes needed if existing policy is "Enable read access for all users"
