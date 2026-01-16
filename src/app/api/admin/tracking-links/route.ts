import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
    TrackingLinkWithDetails,
    TrackingSource,
    TrackingSubtag,
    CreateTrackingLinkPayload,
    ApiResponse,
    TrackingLinksResponse
} from '@/types/tracking';

export const runtime = 'edge';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_KEY = process.env.ADMIN_KEY;

// Verify admin authentication
function verifyAdmin(request: NextRequest): boolean {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    return key === ADMIN_KEY;
}

// Generate next available slug (c1, c2, c3...)
async function generateNextSlug(modelId: string): Promise<string> {
    const { data: existingLinks } = await supabase
        .from('tracking_links')
        .select('slug')
        .eq('model_id', modelId)
        .order('created_at', { ascending: true });

    if (!existingLinks || existingLinks.length === 0) {
        return 'c1';
    }

    // Extract numbers from existing slugs
    const numbers = existingLinks
        .map(link => {
            const match = link.slug.match(/^c(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);

    const maxNumber = Math.max(0, ...numbers);
    return `c${maxNumber + 1}`;
}

// GET: Fetch all tracking links for a model
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<TrackingLinksResponse>>> {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const modelId = url.searchParams.get('modelId');

    if (!modelId) {
        return NextResponse.json({ success: false, error: 'modelId is required' }, { status: 400 });
    }

    try {
        // Fetch tracking links with source and subtag names
        const { data: links, error: linksError } = await supabase
            .from('tracking_links')
            .select(`
        *,
        source:tracking_sources(id, name, is_custom),
        subtag:tracking_subtags(id, name, source_id)
      `)
            .eq('model_id', modelId)
            .eq('is_archived', false)
            .order('created_at', { ascending: true });

        if (linksError) throw linksError;

        // Fetch all available sources
        const { data: sources, error: sourcesError } = await supabase
            .from('tracking_sources')
            .select('*')
            .order('is_custom', { ascending: true })
            .order('name', { ascending: true });

        if (sourcesError) throw sourcesError;

        // Fetch all subtags
        const { data: subtags, error: subtagsError } = await supabase
            .from('tracking_subtags')
            .select('*')
            .order('name', { ascending: true });

        if (subtagsError) throw subtagsError;

        // Transform links to include flat source/subtag names
        const transformedLinks: TrackingLinkWithDetails[] = (links || []).map(link => ({
            ...link,
            source_name: link.source?.name || null,
            subtag_name: link.subtag?.name || null,
        }));

        return NextResponse.json({
            success: true,
            data: {
                links: transformedLinks,
                sources: sources || [],
                subtags: subtags || [],
            }
        });

    } catch (error) {
        console.error('Error fetching tracking links:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch tracking links'
        }, { status: 500 });
    }
}

// POST: Create new tracking link
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<TrackingLinkWithDetails>>> {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body: CreateTrackingLinkPayload = await request.json();
        const { modelId, sourceId, subtagId, previewUrl } = body;

        if (!modelId || !sourceId) {
            return NextResponse.json({
                success: false,
                error: 'modelId and sourceId are required'
            }, { status: 400 });
        }

        // Generate next slug
        const slug = await generateNextSlug(modelId);

        // Insert new tracking link
        const { data: newLink, error: insertError } = await supabase
            .from('tracking_links')
            .insert({
                model_id: modelId,
                slug,
                source_id: sourceId,
                subtag_id: subtagId || null,
                preview_url: previewUrl || null,
                click_count: 0,
                is_archived: false,
            })
            .select(`
        *,
        source:tracking_sources(id, name, is_custom),
        subtag:tracking_subtags(id, name, source_id)
      `)
            .single();

        if (insertError) throw insertError;

        const transformedLink: TrackingLinkWithDetails = {
            ...newLink,
            source_name: newLink.source?.name || null,
            subtag_name: newLink.subtag?.name || null,
        };

        return NextResponse.json({ success: true, data: transformedLink });

    } catch (error) {
        console.error('Error creating tracking link:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create tracking link'
        }, { status: 500 });
    }
}
