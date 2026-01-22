export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { RefreshStatus, RefreshViewsResponse } from '@/types/analytics-aggregated';
import { checkAdminPermission, createErrorResponse } from '@/lib/api-permissions';

// Use service role for refresh operations
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Check refresh status and last refresh time
export async function GET(
    request: NextRequest
): Promise<NextResponse<RefreshViewsResponse>> {
    const permCheck = await checkAdminPermission(request);
    if (!permCheck.authorized) {
        return createErrorResponse(permCheck.error || 'Unauthorized', 403) as any;
    }

    try {
        // Get last refresh info from system_config
        const { data, error } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'analytics_last_refresh')
            .single();

        if (error) {
            // If table doesn't exist yet, return default status
            if (error.code === 'PGRST116' || error.code === '42P01') {
                return NextResponse.json({
                    success: true,
                    data: {
                        timestamp: null,
                        duration_ms: null,
                        status: 'never',
                    },
                });
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            data: data.value as RefreshStatus,
        });
    } catch (error) {
        console.error('Error getting refresh status:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get refresh status',
            },
            { status: 500 }
        );
    }
}

// POST: Trigger materialized view refresh
export async function POST(
    request: NextRequest
): Promise<NextResponse<RefreshViewsResponse>> {
    const permCheck = await checkAdminPermission(request);
    if (!permCheck.authorized) {
        return createErrorResponse(permCheck.error || 'Unauthorized', 403) as any;
    }

    try {
        // Check if a refresh is already in progress
        const { data: currentStatus } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'analytics_last_refresh')
            .single();

        if (currentStatus?.value?.status === 'in_progress') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'A refresh is already in progress',
                },
                { status: 409 }
            );
        }

        // Mark refresh as in progress
        await supabase
            .from('system_config')
            .upsert({
                key: 'analytics_last_refresh',
                value: { status: 'in_progress', timestamp: new Date().toISOString() },
                updated_at: new Date().toISOString(),
            });

        // Call the refresh function
        const { data, error } = await supabase.rpc('refresh_analytics_views');

        if (error) {
            // Update status to error
            await supabase
                .from('system_config')
                .update({
                    value: {
                        status: 'error',
                        timestamp: new Date().toISOString(),
                        error_message: error.message,
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('key', 'analytics_last_refresh');

            throw error;
        }

        return NextResponse.json({
            success: true,
            data: data as RefreshStatus,
        });
    } catch (error) {
        console.error('Error refreshing views:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to refresh views',
            },
            { status: 500 }
        );
    }
}
