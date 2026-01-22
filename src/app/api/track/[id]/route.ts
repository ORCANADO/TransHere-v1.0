// ============================================
// TRANSHERE v1.1 - UNIFIED TRACKING API ROUTE
// ============================================

export const runtime = 'edge';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

/**
 * Record a click event with retry logic for high reliability.
 */
async function recordClickWithRetry(
    supabase: any,
    eventData: Record<string, any>,
    retries = 0
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('analytics_events')
            .insert(eventData);

        if (error) throw error;
        return true;
    } catch (error) {
        if (retries < MAX_RETRIES) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)));
            return recordClickWithRetry(supabase, eventData, retries + 1);
        }
        console.error(`[TrackingAPI] Failed to record click after ${MAX_RETRIES} retries:`, error);
        return false;
    }
}

/**
 * GET Handler: Resolves a tracking link and records a click event.
 * URL: /api/track/[id]
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: trackingId } = await params;

    // Use service role key to bypass RLS for internal tracking logic
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );

    // Resolve tracking link by slug (standard in this project) or ID
    const { data: linkData, error } = await supabase
        .from('tracking_links')
        .select('*, model:models(slug)')
        .or(`slug.eq."${trackingId}",id.eq."${trackingId}"`)
        .eq('is_active', true)
        .is('is_archived', false)
        .single();

    if (error || !linkData) {
        console.error(`[TrackingAPI] Link not found: ${trackingId}`, error);
        return NextResponse.json({ error: 'Link not found or inactive' }, { status: 404 });
    }

    // Record click event
    const eventData = {
        event_type: 'link_click',
        tracking_link_id: linkData.id,
        model_id: linkData.model_id,
        model_slug: (linkData.model as any)?.slug || null,
        page_path: `/api/track/${trackingId}`,
        referrer: request.headers.get('referer') || request.headers.get('referrer'),
        user_agent: request.headers.get('user-agent'),
        country: request.headers.get('cf-ipcountry') || request.headers.get('x-user-country'),
        city: request.headers.get('cf-ipcity') || request.headers.get('x-user-city'),
        is_tracking_visit: true,
        created_at: new Date().toISOString()
    };

    // Fire and forget - don't block the redirect
    recordClickWithRetry(supabase, eventData);

    // Build destination URL
    let destinationUrl = linkData.destination_url;

    // Fallback to model page if no destination_url
    if (!destinationUrl && (linkData.model as any)?.slug) {
        const internalUrl = new URL(`/model/${(linkData.model as any).slug}`, request.url);
        internalUrl.searchParams.set('ref', linkData.slug);
        destinationUrl = internalUrl.toString();
    }

    if (!destinationUrl) {
        return NextResponse.json({ error: 'Destination URL not configured' }, { status: 400 });
    }

    // Redirect immediately (302 Found)
    return NextResponse.redirect(destinationUrl, 302);
}
