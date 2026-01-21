import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

// GET - List all tracking links for an organization
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();

    // Set organization context for RLS
    await supabase.rpc('set_organization_context', { org_id: orgId });

    const { data, error } = await supabase
        .from('tracking_links')
        .select('*, model:models(name, slug)')
        .eq('organization_id', orgId)
        .is('is_archived', false)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
}

// POST - Create a new tracking link
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    // Set organization context for RLS
    await supabase.rpc('set_organization_context', { org_id: orgId });

    const { data, error } = await supabase
        .from('tracking_links')
        .insert({
            organization_id: orgId,
            name: body.name,
            slug: body.slug,
            destination_url: body.destination_url,
            model_id: body.model_id || null,
            source_id: body.source_id || null,
            is_active: true,
            is_archived: false
        })
        .select('*, model:models(name, slug)')
        .single();

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
}
