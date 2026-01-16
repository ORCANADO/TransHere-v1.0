import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
    TrackingLinkWithDetails,
    UpdateTrackingLinkPayload,
    ApiResponse
} from '@/types/tracking';

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

interface RouteParams {
    params: Promise<{ linkId: string }>;
}

// PUT: Update tracking link
export async function PUT(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<ApiResponse<TrackingLinkWithDetails>>> {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { linkId } = await params;
        const body: UpdateTrackingLinkPayload = await request.json();
        const { sourceId, subtagId, previewUrl } = body;

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};
        if (sourceId !== undefined) updateData.source_id = sourceId;
        if (subtagId !== undefined) updateData.subtag_id = subtagId || null;
        if (previewUrl !== undefined) updateData.preview_url = previewUrl || null;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No fields to update'
            }, { status: 400 });
        }

        const { data: updatedLink, error: updateError } = await supabase
            .from('tracking_links')
            .update(updateData)
            .eq('id', linkId)
            .select(`
        *,
        source:tracking_sources(id, name, is_custom),
        subtag:tracking_subtags(id, name, source_id)
      `)
            .single();

        if (updateError) throw updateError;

        if (!updatedLink) {
            return NextResponse.json({
                success: false,
                error: 'Tracking link not found'
            }, { status: 404 });
        }

        const transformedLink: TrackingLinkWithDetails = {
            ...updatedLink,
            source_name: updatedLink.source?.name || null,
            subtag_name: updatedLink.subtag?.name || null,
        };

        return NextResponse.json({ success: true, data: transformedLink });

    } catch (error) {
        console.error('Error updating tracking link:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update tracking link'
        }, { status: 500 });
    }
}

// DELETE: Archive tracking link (soft delete)
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ archived: boolean }>>> {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { linkId } = await params;

        // Soft delete: set is_archived = true
        const { error: archiveError } = await supabase
            .from('tracking_links')
            .update({ is_archived: true })
            .eq('id', linkId);

        if (archiveError) throw archiveError;

        return NextResponse.json({
            success: true,
            data: { archived: true }
        });

    } catch (error) {
        console.error('Error archiving tracking link:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to archive tracking link'
        }, { status: 500 });
    }
}
