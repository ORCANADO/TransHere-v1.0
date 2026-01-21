import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// GET - Get single model
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; modelId: string }> }
) {
    const { orgId, modelId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('id', modelId)
        .eq('organization_id', orgId)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
}

// PATCH - Update model
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; modelId: string }> }
) {
    const { orgId, modelId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from('models')
        .update(body)
        .eq('id', modelId)
        .eq('organization_id', orgId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
}

// DELETE - Remove model from organization (set organization_id to null)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string; modelId: string }> }
) {
    const { orgId, modelId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
        .from('models')
        .update({ organization_id: null })
        .eq('id', modelId)
        .eq('organization_id', orgId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
