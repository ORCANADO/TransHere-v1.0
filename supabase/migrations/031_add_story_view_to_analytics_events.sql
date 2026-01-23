-- ============================================
-- TRANSHERE v1.1 - EXPAND ANALYTICS EVENT TYPES
-- Migration: 031_add_story_view_to_analytics_events.sql
-- ============================================

-- Drop the existing constraint from the parent table
-- Note: PostgreSQL partitioned tables inherit this constraint.
-- The name was inherited from migration 020 where it was created on 'analytics_events_partitioned'
ALTER TABLE analytics_events 
DROP CONSTRAINT IF EXISTS analytics_events_partitioned_event_type_check;

-- Re-add the constraint with 'story_view' and 'conversion' included
ALTER TABLE analytics_events 
ADD CONSTRAINT analytics_events_event_type_check 
CHECK (event_type IN ('page_view', 'link_click', 'story_view', 'conversion'));

-- Note: In PostgreSQL, when you add/drop a constraint on a partitioned table, 
-- it automatically propagates to all existing and future partitions.
