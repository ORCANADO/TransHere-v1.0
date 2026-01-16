// ============================================
// TRANSHERE v1.1 - TRACKING LINK CACHE
// ============================================

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CachedTrackingLink, TrackingLinkLookupResult } from '@/types/tracking';

/**
 * Cache TTL: 1 hour (3600 seconds)
 * This balances freshness with performance for tracking links.
 */
const CACHE_TTL_SECONDS = 3600;

/**
 * Fetch tracking link data from Supabase.
 * This is the uncached version called by the cache wrapper.
 * 
 * @param modelSlug - The model's URL slug
 * @param trackingSlug - The tracking link slug (e.g., "c1", "c2")
 */
async function fetchTrackingLinkUncached(
  modelSlug: string,
  trackingSlug: string
): Promise<CachedTrackingLink | null> {
  const supabase = await createClient();

  // Join tracking_links with models to get model_slug
  const { data, error } = await supabase
    .from('tracking_links')
    .select(`
      id,
      model_id,
      source_id,
      subtag_id,
      is_active,
      models!inner (
        slug
      )
    `)
    .eq('slug', trackingSlug)
    .eq('is_archived', false)
    .eq('models.slug', modelSlug)
    .single();

  if (error || !data) {
    return null;
  }

  // Transform to CachedTrackingLink shape
  const modelData = data.models as unknown as { slug: string };

  return {
    id: data.id,
    model_slug: modelData.slug,
    model_id: data.model_id,
    source_id: data.source_id,
    subtag_id: data.subtag_id,
    is_active: data.is_active,
  };
}

/**
 * Cached tracking link lookup.
 * Uses Next.js unstable_cache with 1-hour TTL.
 * Cache key: ["tracking-link", modelSlug, trackingSlug]
 */
export const getTrackingLinkCached = unstable_cache(
  async (modelSlug: string, trackingSlug: string): Promise<CachedTrackingLink | null> => {
    return fetchTrackingLinkUncached(modelSlug, trackingSlug);
  },
  ['tracking-link'],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: ['tracking-links'],
  }
);

/**
 * Main lookup function that returns structured result.
 * Used by the route handler to determine redirect target.
 * 
 * @param modelSlug - The model's URL slug
 * @param trackingSlug - The tracking link slug
 * @returns TrackingLinkLookupResult with redirect URL
 */
export async function lookupTrackingLink(
  modelSlug: string,
  trackingSlug: string
): Promise<TrackingLinkLookupResult> {
  const data = await getTrackingLinkCached(modelSlug, trackingSlug);

  // Base redirect URL (model profile page)
  const baseRedirectUrl = `/model/${modelSlug}`;

  if (!data) {
    return {
      found: false,
      data: null,
      redirect_url: baseRedirectUrl,
    };
  }

  if (!data.is_active) {
    // Link exists but is inactive - redirect without tracking
    return {
      found: false,
      data: null,
      redirect_url: baseRedirectUrl,
    };
  }

  // Add ref parameter to track this was a tracking link visit
  const redirectUrl = `${baseRedirectUrl}?ref=${trackingSlug}`;

  return {
    found: true,
    data,
    redirect_url: redirectUrl,
  };
}

/**
 * Invalidate tracking link cache for a specific model.
 * Call this when tracking links are created, updated, or deleted.
 * 
 * @param modelSlug - The model's URL slug
 */
export async function invalidateTrackingLinkCache(modelSlug: string): Promise<void> {
  // Note: In Next.js 15, we use revalidateTag for cache invalidation
  // This requires the 'use server' directive in the calling context
  const { revalidateTag } = await import('next/cache');
  revalidateTag('tracking-links');
}
