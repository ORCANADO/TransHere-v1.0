import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { TrackingSource, CreateCustomSourcePayload, ApiResponse } from '@/types/tracking';

export const runtime = 'edge';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_KEY = process.env.ADMIN_KEY;

function verifyAdmin(request: NextRequest): boolean {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    return key === ADMIN_KEY;
}

// GET: Fetch all traffic sources
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<TrackingSource[]>>> {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: sources, error } = await supabase
            .from('tracking_sources')
            .select('*')
            .order('is_custom', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, data: sources || [] });

    } catch (error) {
        console.error('Error fetching sources:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch sources'
        }, { status: 500 });
    }
}

// POST: Create custom traffic source
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<TrackingSource>>> {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body: CreateCustomSourcePayload = await request.json();
        const { name } = body;

        if (!name || name.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Source name is required'
            }, { status: 400 });
        }

        // Check if source already exists
        const { data: existing } = await supabase
            .from('tracking_sources')
            .select('id')
            .ilike('name', name.trim())
            .single();

        if (existing) {
            return NextResponse.json({
                success: false,
                error: 'A source with this name already exists'
            }, { status: 409 });
        }

        // Generate slug from name
        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        const { data: newSource, error: insertError } = await supabase
            .from('tracking_sources')
            .insert({
                name: name.trim(),
                slug,
                is_custom: true,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, data: newSource });

    } catch (error) {
        console.error('Error creating custom source:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create source'
        }, { status: 500 });
    }
}
