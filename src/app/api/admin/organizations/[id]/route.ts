import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Organization Update/Delete API Route
 * 
 * Handles PUT (update) and DELETE operations for individual organizations.
 */

// PUT - Update organization
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key');

    const ADMIN_KEY = process.env.ADMIN_KEY;
    if (adminKey !== ADMIN_KEY) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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

    try {
        const { id } = await params;
        const body = await request.json();
        const { name, regenerate_key } = body;

        const updates: any = {};

        // Update name if provided
        if (name) {
            if (typeof name !== 'string' || name.length > 100) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid organization name'
                }, { status: 400 });
            }

            // Check for duplicate name (excluding current organization)
            const { data: existing } = await supabase
                .from('organizations')
                .select('id')
                .eq('name', name)
                .neq('id', id)
                .single();

            if (existing) {
                return NextResponse.json({
                    success: false,
                    error: 'An organization with this name already exists'
                }, { status: 409 });
            }

            updates.name = name;
        }

        // Regenerate API key if requested
        if (regenerate_key === true) {
            updates.api_key = crypto.randomUUID();
        }

        // Update organization
        const { data, error } = await supabase
            .from('organizations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating organization:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error in PUT /api/admin/organizations/[id]:', err);
        return NextResponse.json({
            success: false,
            error: err instanceof Error ? err.message : 'Invalid request'
        }, { status: 400 });
    }
}

// DELETE - Delete organization
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key');

    const ADMIN_KEY = process.env.ADMIN_KEY;
    if (adminKey !== ADMIN_KEY) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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

    try {
        const { id } = await params;

        // Check if organization has assigned models
        const { count } = await supabase
            .from('models')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', id);

        if (count && count > 0) {
            return NextResponse.json({
                success: false,
                error: `Cannot delete organization with ${count} assigned model${count > 1 ? 's' : ''}. Please unassign all models first.`
            }, { status: 400 });
        }

        // Delete organization
        const { error } = await supabase
            .from('organizations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting organization:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Organization deleted successfully'
        });
    } catch (err) {
        console.error('Error in DELETE /api/admin/organizations/[id]:', err);
        return NextResponse.json({
            success: false,
            error: err instanceof Error ? err.message : 'Invalid request'
        }, { status: 400 });
    }
}
