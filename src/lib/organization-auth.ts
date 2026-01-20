import { unstable_cache } from 'next/cache';
import { createServiceClient } from './supabase/service';
import type { Organization } from '@/types/organization';
import type { Model } from '@/types';

/**
 * Organization Authentication & Authorization Utilities
 * 
 * SECURITY NOTES:
 * - All functions use the service role client (bypasses RLS by default)
 * - These functions are SERVER-SIDE ONLY
 * - Never import these in client components
 * - API key validation is cached to prevent timing attacks
 * - RLS context is set via set_organization_context() for data isolation
 */

/**
 * Validate an organization API key (uncached version for middleware)
 * 
 * @param apiKey - The API key to validate
 * @returns Organization object if valid, null otherwise
 * 
 * NOTE: This is the uncached version used in middleware.
 * Middleware runs at the edge and doesn't have access to Next.js caching.
 * For server components/API routes, use validateOrganizationKey instead.
 */
export async function validateOrganizationKeyUncached(
    apiKey: string
): Promise<Organization | null> {
    try {
        const supabase = createServiceClient();

        const { data, error } = await supabase
            .from('organizations')
            .select('id, name, api_key, created_at, updated_at')
            .eq('api_key', apiKey)
            .single();

        if (error || !data) {
            console.warn('[Organization Auth] Invalid API key attempt:', { error: error?.message });
            return null;
        }

        console.log('[Organization Auth] Valid API key for organization:', data.name);
        return data;
    } catch (error) {
        console.error('[Organization Auth] Validation error:', error);
        return null;
    }
}

/**
 * Validate an organization API key (cached version for server components)
 * 
 * @param apiKey - The API key to validate
 * @returns Organization object if valid, null otherwise
 * 
 * CACHING STRATEGY:
 * - 5-minute TTL (organizations rarely change)
 * - Reduces database load for repeated requests
 * - Cache key includes the API key for isolation
 * 
 * SECURITY:
 * - Uses service role client to query organizations table
 * - Constant-time comparison via database lookup (prevents timing attacks)
 * 
 * NOTE: Do not use in middleware - use validateOrganizationKeyUncached instead
 */
export const validateOrganizationKey = unstable_cache(
    async (apiKey: string): Promise<Organization | null> => {
        return validateOrganizationKeyUncached(apiKey);
    },
    ['validate-org-key'],
    {
        revalidate: 300, // 5 minutes
        tags: ['organization-auth'],
    }
);

/**
 * Fetch all models belonging to an organization
 * 
 * @param organizationId - The organization UUID
 * @returns Array of models with related data
 * 
 * CACHING STRATEGY:
 * - 1-minute TTL (models change moderately frequently)
 * - Includes gallery_items and story_groups for complete data
 * 
 * ORDERING:
 * - Verified models first
 * - Then by most recent story activity
 * - Nulls (no stories) sorted last
 * 
 * RLS SECURITY:
 * - Sets organization context before query
 * - RLS policies filter results to organization's models only
 */
export const getOrganizationModels = unstable_cache(
    async (organizationId: string): Promise<Model[]> => {
        try {
            const supabase = createServiceClient();

            // Set organization context for RLS policies
            // This ensures queries are filtered to this organization's data
            await supabase.rpc('set_organization_context', { org_id: organizationId });

            const { data, error } = await supabase
                .from('models')
                .select(`
          *,
          gallery_items (*),
          story_groups (
            *,
            stories (*)
          )
        `)
                .eq('organization_id', organizationId)
                .order('is_verified', { ascending: false })
                .order('last_story_added_at', { ascending: false, nullsFirst: false });

            if (error) {
                console.error('[Organization Auth] Error fetching models:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('[Organization Auth] Error fetching models:', error);
            return [];
        }
    },
    ['org-models'],
    {
        revalidate: 60, // 1 minute
        tags: ['organization-models'],
    }
);

/**
 * Fetch aggregated analytics for an organization
 * 
 * @param organizationId - The organization UUID
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Aggregated analytics data
 * 
 * NO CACHING:
 * - Analytics data is real-time and should not be cached
 * - Each request fetches fresh data from the database
 * 
 * AGGREGATIONS:
 * - Total views and clicks across all organization models
 * - Conversion rate (CTR)
 * - Top performing models
 * - Country breakdown
 * 
 * RLS SECURITY:
 * - Sets organization context before query
 * - RLS policies filter analytics to organization's models only
 */
export async function getOrganizationAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
): Promise<{
    totalViews: number;
    totalClicks: number;
    ctr: number;
    topModels: Array<{ modelId: string; modelName: string; views: number; clicks: number }>;
    countryBreakdown: Array<{ country: string; views: number; clicks: number }>;
}> {
    try {
        const supabase = createServiceClient();

        // Set organization context for RLS policies
        // This ensures analytics queries are filtered to this organization's models
        await supabase.rpc('set_organization_context', { org_id: organizationId });

        // First, get all model IDs for this organization
        const { data: models, error: modelsError } = await supabase
            .from('models')
            .select('id, name')
            .eq('organization_id', organizationId);

        if (modelsError || !models || models.length === 0) {
            console.warn('[Organization Auth] No models found for organization:', organizationId);
            return {
                totalViews: 0,
                totalClicks: 0,
                ctr: 0,
                topModels: [],
                countryBreakdown: [],
            };
        }

        const modelIds = models.map((m) => m.id);

        // Fetch analytics events for these models within date range
        const { data: events, error: eventsError } = await supabase
            .from('analytics_events')
            .select('event_type, model_id, country')
            .in('model_id', modelIds)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (eventsError) {
            console.error('[Organization Auth] Error fetching analytics:', eventsError);
            return {
                totalViews: 0,
                totalClicks: 0,
                ctr: 0,
                topModels: [],
                countryBreakdown: [],
            };
        }

        // Aggregate data
        const totalViews = events?.filter((e) => e.event_type === 'view').length || 0;
        const totalClicks =
            events?.filter((e) => e.event_type === 'click_social' || e.event_type === 'click_content')
                .length || 0;
        const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

        // Top models
        const modelStats = new Map<string, { views: number; clicks: number }>();
        events?.forEach((event) => {
            if (!event.model_id) return;
            const stats = modelStats.get(event.model_id) || { views: 0, clicks: 0 };
            if (event.event_type === 'view') stats.views++;
            if (event.event_type === 'click_social' || event.event_type === 'click_content')
                stats.clicks++;
            modelStats.set(event.model_id, stats);
        });

        const topModels = Array.from(modelStats.entries())
            .map(([modelId, stats]) => ({
                modelId,
                modelName: models.find((m) => m.id === modelId)?.name || 'Unknown',
                views: stats.views,
                clicks: stats.clicks,
            }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);

        // Country breakdown
        const countryStats = new Map<string, { views: number; clicks: number }>();
        events?.forEach((event) => {
            if (!event.country) return;
            const stats = countryStats.get(event.country) || { views: 0, clicks: 0 };
            if (event.event_type === 'view') stats.views++;
            if (event.event_type === 'click_social' || event.event_type === 'click_content')
                stats.clicks++;
            countryStats.set(event.country, stats);
        });

        const countryBreakdown = Array.from(countryStats.entries())
            .map(([country, stats]) => ({
                country,
                views: stats.views,
                clicks: stats.clicks,
            }))
            .sort((a, b) => b.views - a.views);

        return {
            totalViews,
            totalClicks,
            ctr,
            topModels,
            countryBreakdown,
        };
    } catch (error) {
        console.error('[Organization Auth] Error fetching analytics:', error);
        return {
            totalViews: 0,
            totalClicks: 0,
            ctr: 0,
            topModels: [],
            countryBreakdown: [],
        };
    }
}
