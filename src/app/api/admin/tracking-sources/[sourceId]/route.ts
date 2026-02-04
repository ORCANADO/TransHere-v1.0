import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@/types/tracking';

export const runtime = 'edge';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_KEYS = [
    process.env.ADMIN_KEY,
    process.env.ADMIN_SECRET_KEY
].filter(Boolean) as string[];

function verifyAdmin(request: NextRequest): boolean {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    return !!key && ADMIN_KEYS.includes(key);
}

interface RouteParams {
    params: Promise<{ sourceId: string }>;
}

// DELETE: Remove custom source (only if not in use)
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { sourceId } = await params;

        // Check if source is custom
        const { data: source } = await supabase
            .from('tracking_sources')
            .select('is_custom')
            .eq('id', sourceId)
            .single();

        if (!source) {
            return NextResponse.json({
                success: false,
                error: 'Source not found'
            }, { status: 404 });
        }

        if (!source.is_custom) {
            return NextResponse.json({
                success: false,
                error: 'Cannot delete default sources'
            }, { status: 403 });
        }

        // Check if source is in use by any tracking links
        const { data: usedLinks, error: checkError } = await supabase
            .from('tracking_links')
            .select('id')
            .eq('source_id', sourceId)
            .limit(1);

        if (checkError) throw checkError;

        if (usedLinks && usedLinks.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Cannot delete source that is in use by tracking links'
            }, { status: 409 });
        }

        // Safe to delete
        const { error: deleteError } = await supabase
            .from('tracking_sources')
            .delete()
            .eq('id', sourceId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, data: { deleted: true } });

    } catch (error) {
        console.error('Error deleting source:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete source'
        }, { status: 500 });
    }
}
