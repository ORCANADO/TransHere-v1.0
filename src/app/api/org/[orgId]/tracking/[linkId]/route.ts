import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'edge';

// PATCH - Update a tracking link
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; linkId: string }> }
) {
    const { orgId, linkId } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    // Set organization context for RLS
    await supabase.rpc('set_organization_context', { org_id: orgId });

    const { data, error } = await supabase
        .from('tracking_links')
        .update({
            name: body.name,
            slug: body.slug,
            destination_url: body.destination_url,
            model_id: body.model_id || null,
            source_id: body.source_id || null,
            is_active: body.is_active,
            updated_at: new Date().toISOString()
        })
        .eq('id', linkId)
        .eq('organization_id', orgId)
        .select('*, model:models(name, slug)')
        .single();

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
}

// DELETE - Archive/Delete a tracking link
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; linkId: string }> }
) {
    const { orgId, linkId } = await params;
    const supabase = createServiceClient();

    // Set organization context for RLS
    await supabase.rpc('set_organization_context', { org_id: orgId });

    // Soft delete for tracking links
    const { error } = await supabase
        .from('tracking_links')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', linkId)
        .eq('organization_id', orgId);

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
