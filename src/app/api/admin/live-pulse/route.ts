import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    // Ensure seconds is a valid number, default to 60, min 10
    let seconds = parseInt(searchParams.get('seconds') || '60', 10);
    if (isNaN(seconds) || seconds < 10) seconds = 60;

    if (!key || key !== ADMIN_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // STRICT UTC ISO STRING
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - seconds * 1000);
    const cutoff = cutoffDate.toISOString();

    const { count, error } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoff)
        .lte('created_at', now.toISOString());

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0, since: cutoff });
}
