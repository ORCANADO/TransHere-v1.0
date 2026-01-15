// ============================================
// TRANSHERE v1.1 - ANALYTICS VIEW REFRESH API
// Manual trigger for materialized view refresh
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

const ADMIN_KEY = process.env.ADMIN_KEY || process.env.ADMIN_SECRET || 'admin123';

/**
 * Verify admin authorization
 */
function isAuthorized(request: NextRequest): boolean {
    const url = new URL(request.url);
    return url.searchParams.get('key') === ADMIN_KEY;
}

/**
 * POST /api/admin/refresh-views
 * 
 * Manually triggers refresh of analytics materialized views.
 * This calls the refresh_analytics_views() PostgreSQL function
 * created in the migration.
 * 
 * Requires: ?key=ADMIN_SECRET
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const supabase = await createClient();

        // Call the PostgreSQL function to refresh views
        const { error } = await supabase.rpc('refresh_analytics_views');

        if (error) {
            console.error('[refresh-views] RPC error:', error);
            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                    details: 'Failed to refresh materialized views'
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Analytics views refreshed successfully',
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[refresh-views] Unexpected error:', errorMessage);

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                details: 'An unexpected error occurred'
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/refresh-views
 * 
 * Returns the last refresh status and cron job info.
 * Useful for debugging the automatic refresh schedule.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    if (!isAuthorized(request)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const supabase = await createClient();

        // Check cron job status (if pg_cron is enabled)
        const { data: cronJobs, error: cronError } = await supabase
            .from('cron.job')
            .select('jobid, jobname, schedule, command')
            .eq('jobname', 'refresh-analytics-views-10min')
            .single();

        // Get last run details
        const { data: lastRun, error: runError } = await supabase
            .from('cron.job_run_details')
            .select('job_pid, status, return_message, start_time, end_time')
            .order('start_time', { ascending: false })
            .limit(5);

        return NextResponse.json({
            success: true,
            cronJob: cronError ? null : cronJobs,
            recentRuns: runError ? [] : lastRun,
            note: cronError ? 'pg_cron may not be enabled or accessible' : undefined,
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        return NextResponse.json({
            success: false,
            error: errorMessage,
            note: 'Could not retrieve cron status. Views may still be refreshing automatically.',
        });
    }
}
