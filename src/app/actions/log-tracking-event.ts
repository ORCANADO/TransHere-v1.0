// ============================================
// TRANSHERE v1.1 - ANALYTICS LOGGING SERVER ACTION
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import type { AnalyticsPayload } from '@/types/tracking';

/**
 * Log a tracking analytics event to the database.
 * This is a Server Action designed to be called from after() callbacks.
 * 
 * Security: Uses service_role implicitly via server-side Supabase client.
 * RLS: analytics_events table allows public INSERT via policy.
 * 
 * @param payload - The analytics event data
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function logTrackingEvent(
  payload: AnalyticsPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: payload.event_type,
        model_id: payload.model_id,
        model_slug: payload.model_slug,
        tracking_link_id: payload.tracking_link_id,
        source_id: payload.source_id,
        subtag_id: payload.subtag_id,
        is_tracking_visit: payload.is_tracking_visit,
        page_path: payload.page_path,
        country: payload.country,
        city: payload.city,
        referrer: payload.referrer,
        user_agent: payload.user_agent,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('[logTrackingEvent] Supabase insert error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[logTrackingEvent] Unexpected error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Increment the click_count on a tracking link.
 * Uses the database function for atomic increment.
 * 
 * @param linkId - The tracking link UUID
 */
export async function incrementTrackingLinkClicks(
  linkId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .rpc('increment_tracking_link_clicks', { link_id: linkId });
    
    if (error) {
      console.error('[incrementTrackingLinkClicks] RPC error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[incrementTrackingLinkClicks] Unexpected error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
