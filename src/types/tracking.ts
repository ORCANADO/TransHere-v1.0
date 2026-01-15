// ============================================
// TRANSHERE v1.1 - TRACKING SYSTEM TYPES
// ============================================

/**
 * Traffic source (tag) for tracking attribution
 */
export interface TrafficSource {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
  is_deletable: boolean;
  sort_order: number;
  created_at: string;
}

/**
 * Subtag for granular tracking attribution
 */
export interface TrackingSubtag {
  id: string;
  source_id: string;
  name: string;
  slug: string;
  created_at: string;
  // Joined data
  source?: TrafficSource;
}

/**
 * Tracking link with full attribution data
 */
export interface TrackingLink {
  id: string;
  model_id: string;
  source_id: string;
  subtag_id: string | null;
  slug: string;
  is_active: boolean;
  is_archived: boolean;
  archived_at: string | null;
  click_count: number;
  created_at: string;
  // Joined data
  source?: TrafficSource;
  subtag?: TrackingSubtag | null;
  model?: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Cached tracking link data for redirect handler
 * Minimal data needed for fast redirects
 */
export interface CachedTrackingLink {
  id: string;
  model_slug: string;
  model_id: string;
  source_id: string;
  subtag_id: string | null;
  is_active: boolean;
}

/**
 * Analytics event types matching database constraint
 */
export type AnalyticsEventType = 'page_view' | 'link_click';

/**
 * Payload for logging analytics events
 */
export interface AnalyticsPayload {
  event_type: AnalyticsEventType;
  model_id: string | null;
  model_slug: string | null;
  tracking_link_id: string | null;
  source_id: string | null;
  subtag_id: string | null;
  is_tracking_visit: boolean;
  page_path: string;
  country: string | null;
  city: string | null;
  referrer: string | null;
  user_agent: string | null;
}

/**
 * Result of tracking link lookup
 */
export interface TrackingLinkLookupResult {
  found: boolean;
  data: CachedTrackingLink | null;
  redirect_url: string;
}

/**
 * Geolocation data extracted from Cloudflare headers
 */
export interface GeoData {
  country: string | null;
  city: string | null;
}
