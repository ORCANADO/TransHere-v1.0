// ============================================
// TRANSHERE v1.1 - TRACKING SYSTEM TYPES
// ============================================

/**
 * Traffic source for tracking attribution
 */
export interface TrackingSource {
  id: string;
  name: string;
  is_custom: boolean;
  created_at: string;
}

/**
 * Subtag for granular tracking attribution
 */
export interface TrackingSubtag {
  id: string;
  source_id: string;
  name: string;
  created_at: string;
}

/**
 * Tracking link with full attribution data
 */
export interface TrackingLink {
  id: string;
  organization_id: string | null;
  model_id: string | null;
  name: string | null;
  slug: string;
  destination_url: string | null;
  source_id: string | null;
  subtag_id: string | null;
  preview_url: string | null;
  click_count: number;
  is_active?: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
  // Joined fields
  source?: TrackingSource;
  subtag?: TrackingSubtag;
  model?: {
    name: string;
    slug: string;
  };
}

export interface TrackingLinkWithDetails extends TrackingLink {
  source_name: string | null;
  subtag_name: string | null;
}

export interface CreateTrackingLinkPayload {
  modelId: string;
  sourceId: string;
  subtagId?: string | null;
  previewUrl?: string | null;
}

export interface UpdateTrackingLinkPayload {
  sourceId?: string;
  subtagId?: string | null;
  previewUrl?: string | null;
}

export interface CreateCustomSourcePayload {
  name: string;
}

// API Response types
export interface TrackingLinksResponse {
  links: TrackingLinkWithDetails[];
  sources: TrackingSource[];
  subtags: TrackingSubtag[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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
export type AnalyticsEventType = 'page_view' | 'link_click' | 'conversion' | 'story_view' | 'bridge_view';

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

/**
 * Detailed tracking link click record
 */
export interface TrackingLinkClick {
  id: string;
  tracking_link_id: string;
  clicked_at: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  country?: string;
  city?: string;
}

/**
 * Per-tracking-link daily analytics
 */
export interface TrackingLinkDailyStats {
  date: string;
  clicks: number;
  views: number;
}

export interface TrackingLinkAnalyticsSummary {
  totalClicks: number;
  totalViews: number;
  avgClicksPerDay: number;
  daysInRange: number;
}

export interface TrackingLinkAnalyticsResponse {
  daily: TrackingLinkDailyStats[];
  summary: TrackingLinkAnalyticsSummary;
}
