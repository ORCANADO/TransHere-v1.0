import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Organizations API Route
 * 
 * Handles CRUD operations for organizations in the admin dashboard.
 * All endpoints require admin key validation.
 */

// GET - List all organizations with model counts
export async function GET(request: Request) {
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
        // Fetch organizations with model counts
        const { data: organizations, error } = await supabase
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching organizations:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Get model count for each organization
        const organizationsWithCounts = await Promise.all(
            (organizations || []).map(async (org) => {
                const { count } = await supabase
                    .from('models')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', org.id);

                return {
                    ...org,
                    model_count: count || 0,
                };
            })
        );

        return NextResponse.json({ success: true, data: organizationsWithCounts });
    } catch (err) {
        console.error('Error in GET /api/admin/organizations:', err);
        return NextResponse.json({
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 });
    }
}

// POST - Create new organization
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
        const { name } = body;

        // Validate name
        if (!name || typeof name !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Organization name is required'
            }, { status: 400 });
        }

        if (name.length > 100) {
            return NextResponse.json({
                success: false,
                error: 'Organization name must be 100 characters or less'
            }, { status: 400 });
        }

        // Check for duplicate name
        const { data: existing } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', name)
            .single();

        if (existing) {
            return NextResponse.json({
                success: false,
                error: 'An organization with this name already exists'
            }, { status: 409 });
        }

        // Generate API key using crypto.randomUUID()
        const apiKey = crypto.randomUUID();

        // Insert organization
        const { data, error } = await supabase
            .from('organizations')
            .insert({
                name,
                api_key: apiKey,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating organization:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('Error in POST /api/admin/organizations:', err);
        return NextResponse.json({
            success: false,
            error: err instanceof Error ? err.message : 'Invalid request'
        }, { status: 400 });
    }
}
