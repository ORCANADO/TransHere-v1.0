import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const runtime = 'edge';

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

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

        const supabase = createClient();

        // Create the subtag
        const { data, error } = await supabase
            .from('tracking_subtags')
            .insert({
                name,
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
