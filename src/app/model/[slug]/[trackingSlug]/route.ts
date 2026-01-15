// ============================================
// TRANSHERE v1.1 - TRACKING ROUTE HANDLER
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { lookupTrackingLink } from '@/lib/tracking-cache';
import { isBot, sanitizeUserAgent } from '@/lib/bot-detection';
import { logTrackingEvent, incrementTrackingLinkClicks } from '@/app/actions/log-tracking-event';
import type { AnalyticsPayload, GeoData } from '@/types/tracking';

/**
 * Edge runtime for Cloudflare Pages compatibility.
 * Required for cf-ipcountry and cf-ipcity headers.
 */
export const runtime = 'edge';

/**
 * Route parameters for tracking links.
 * URL pattern: /model/[slug]/[trackingSlug]
 * Example: /model/valentina-aguirre/c1
 */
interface RouteParams {
  params: Promise<{
    slug: string;
    trackingSlug: string;
  }>;
}

/**
 * Extract geolocation data from Cloudflare headers.
 * Falls back to middleware headers if CF headers unavailable.
 */
function extractGeoData(request: NextRequest): GeoData {
  // Try Cloudflare headers first
  const country = request.headers.get('cf-ipcountry') 
    || request.headers.get('x-user-country')
    || null;
  
  const city = request.headers.get('cf-ipcity')
    || request.headers.get('x-user-city')
    || null;
  
  return { country, city };
}

/**
 * GET handler for tracking link redirects.
 * 
 * Flow:
 * 1. Lookup tracking link (cached, 1hr TTL)
 * 2. Return 307 redirect immediately
 * 3. Use after() to log analytics without blocking response
 * 
 * URL: /model/[slug]/[trackingSlug]
 * Redirects to: /model/[slug]?ref=[trackingSlug]
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { slug: modelSlug, trackingSlug } = await params;
  
  // Step 1: Lookup tracking link (uses unstable_cache, 1hr TTL)
  const lookupResult = await lookupTrackingLink(modelSlug, trackingSlug);
  
  // Build absolute redirect URL
  const redirectUrl = new URL(lookupResult.redirect_url, request.url);
  
  // Step 2: Return 307 redirect immediately (do not await anything else)
  const response = NextResponse.redirect(redirectUrl, 307);
  
  // Step 3: Log analytics in after() - does not block response
  after(async () => {
    // Extract request metadata
    const userAgent = request.headers.get('user-agent');
    const referrer = request.headers.get('referer') || request.headers.get('referrer');
    
    // Bot check - skip logging for bots
    if (isBot(userAgent)) {
      return; // Exit early, don't log bot traffic
    }
    
    // Only log if tracking link was found and active
    if (!lookupResult.found || !lookupResult.data) {
      return; // Invalid or inactive link, skip logging
    }
    
    const trackingData = lookupResult.data;
    const geoData = extractGeoData(request);
    
    // Build analytics payload
    const analyticsPayload: AnalyticsPayload = {
      event_type: 'page_view',
      model_id: trackingData.model_id,
      model_slug: trackingData.model_slug,
      tracking_link_id: trackingData.id,
      source_id: trackingData.source_id,
      subtag_id: trackingData.subtag_id,
      is_tracking_visit: true,
      page_path: `/model/${modelSlug}/${trackingSlug}`,
      country: geoData.country,
      city: geoData.city,
      referrer: referrer ? referrer.substring(0, 2000) : null,
      user_agent: sanitizeUserAgent(userAgent),
    };
    
    // Fire and forget - log event and increment click count
    // These run concurrently and don't block each other
    await Promise.all([
      logTrackingEvent(analyticsPayload),
      incrementTrackingLinkClicks(trackingData.id),
    ]);
  });
  
  return response;
}

/**
 * HEAD handler - same redirect logic without body.
 * Some crawlers use HEAD requests.
 */
export async function HEAD(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { slug: modelSlug, trackingSlug } = await params;
  
  const lookupResult = await lookupTrackingLink(modelSlug, trackingSlug);
  const redirectUrl = new URL(lookupResult.redirect_url, request.url);
  
  // Return redirect without after() logging for HEAD requests
  return NextResponse.redirect(redirectUrl, 307);
}
