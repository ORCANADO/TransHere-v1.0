import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkModelAccess, createErrorResponse } from '@/lib/api-permissions';
import type { TrackingLinkAnalyticsResponse, ApiResponse } from '@/types/tracking';

export const runtime = 'edge';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
    params: Promise<{ linkId: string }>;
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
): Promise<NextResponse<ApiResponse<TrackingLinkAnalyticsResponse>>> {
    try {
        const { linkId } = await params;

        // Fetch link to check model and organization access
        const { data: link, error: linkError } = await supabase
            .from('tracking_links')
            .select(`
                id,
                model_id,
                models:models(organization_id)
            `)
            .eq('id', linkId)
            .single();

        if (linkError || !link) {
            return createErrorResponse('Tracking link not found', 404);
        }

        // Check model access
        const modelOrgId = (link.models as any)?.organization_id;
        const permCheck = await checkModelAccess(request, modelOrgId);
        if (!permCheck.authorized) {
            return createErrorResponse(permCheck.error || 'Unauthorized', 403);
        }

        // Parse date range
        const url = new URL(request.url);
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json(
                { success: false, error: 'startDate and endDate are required' } as any,
                { status: 400 }
            );
        }

        // Query analytics_daily_stats where traffic_source = linkId
        const { data: dailyData, error: dailyError } = await supabase
            .from('analytics_daily_stats')
            .select('date, views, clicks')
            .eq('traffic_source', linkId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (dailyError) {
            console.error('Error fetching daily stats:', dailyError);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch analytics data' } as any,
                { status: 500 }
            );
        }

        // Aggregate by date (multiple rows per date possible due to model_slug/country breakdown)
        const dateMap = new Map<string, { clicks: number; views: number }>();
        (dailyData || []).forEach((row: any) => {
            const existing = dateMap.get(row.date) || { clicks: 0, views: 0 };
            dateMap.set(row.date, {
                clicks: existing.clicks + (row.clicks || 0),
                views: existing.views + (row.views || 0),
            });
        });

        const daily = Array.from(dateMap.entries())
            .map(([date, stats]) => ({ date, clicks: stats.clicks, views: stats.views }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // If no data from daily stats, try raw analytics_events as fallback
        if (daily.length === 0) {
            const { data: rawEvents, error: rawError } = await supabase
                .from('analytics_events')
                .select('created_at, event_type')
                .eq('tracking_link_id', linkId)
                .gte('created_at', `${startDate}T00:00:00Z`)
                .lte('created_at', `${endDate}T23:59:59Z`)
                .order('created_at', { ascending: true });

            if (!rawError && rawEvents && rawEvents.length > 0) {
                const rawDateMap = new Map<string, { clicks: number; views: number }>();
                rawEvents.forEach((evt: any) => {
                    const date = evt.created_at.split('T')[0];
                    const existing = rawDateMap.get(date) || { clicks: 0, views: 0 };
                    if (evt.event_type === 'link_click') {
                        existing.clicks++;
                    } else {
                        existing.views++;
                    }
                    rawDateMap.set(date, existing);
                });

                Array.from(rawDateMap.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .forEach(([date, stats]) => daily.push({ date, clicks: stats.clicks, views: stats.views }));
            }
        }

        // Calculate summary
        const totalClicks = daily.reduce((sum, d) => sum + d.clicks, 0);
        const totalViews = daily.reduce((sum, d) => sum + d.views, 0);
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysInRange = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const avgClicksPerDay = Math.round((totalClicks / daysInRange) * 100) / 100;

        return NextResponse.json({
            success: true,
            data: {
                daily,
                summary: {
                    totalClicks,
                    totalViews,
                    avgClicksPerDay,
                    daysInRange,
                },
            },
        });
    } catch (error) {
        console.error('Tracking link analytics error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to fetch analytics' } as any,
            { status: 500 }
        );
    }
}
