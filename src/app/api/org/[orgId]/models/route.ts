import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// GET - List organization models
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
}

// POST - Add model to organization
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from('models')
        .insert({
            ...body,
            organization_id: orgId
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
}
