import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Model Assignment API Route
 * 
 * Handles assigning/unassigning models to organizations.
 */

// POST - Assign or unassign model to organization
export async function POST(request: Request) {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key');

    const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';
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
        const body = await request.json();
        const { model_id, organization_id } = body;

        // Validate model_id
        if (!model_id || typeof model_id !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Model ID is required'
            }, { status: 400 });
        }

        // Validate organization_id (can be null for unassignment)
        if (organization_id !== null && typeof organization_id !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Invalid organization ID'
            }, { status: 400 });
        }

        // If assigning, verify organization exists
        if (organization_id) {
            const { data: org } = await supabase
                .from('organizations')
                .select('id')
                .eq('id', organization_id)
                .single();

            if (!org) {
                return NextResponse.json({
                    success: false,
                    error: 'Organization not found'
                }, { status: 404 });
            }
        }

        // Update model's organization_id
        const { data, error } = await supabase
            .from('models')
            .update({ organization_id })
            .eq('id', model_id)
            .select()
            .single();

        if (error) {
            console.error('Error assigning model:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({
                success: false,
                error: 'Model not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data,
            message: organization_id
                ? 'Model assigned to organization successfully'
                : 'Model unassigned from organization successfully'
        });
    } catch (err) {
        console.error('Error in POST /api/admin/models/assign:', err);
        return NextResponse.json({
            success: false,
            error: err instanceof Error ? err.message : 'Invalid request'
        }, { status: 400 });
    }
}
