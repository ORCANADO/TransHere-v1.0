import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_KEY = process.env.ADMIN_KEY;

// Verify admin key helper
const verifyAdmin = (req: NextRequest) => {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    return key === ADMIN_KEY;
};

export async function POST(req: NextRequest) {
    if (!verifyAdmin(req)) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();
        const { name, sourceId } = body;

        if (!name || !sourceId) {
            return NextResponse.json(
                { success: false, error: 'Name and Source ID are required' },
                { status: 400 }
            );
        }

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Create the subtag
        const { data, error } = await supabase
            .from('tracking_subtags')
            .insert({
                name,
                slug,
                source_id: sourceId
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error creating subtag:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create subtag' },
            { status: 500 }
        );
    }
}
