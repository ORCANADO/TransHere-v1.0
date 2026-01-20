export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateOrganizationKeyUncached } from '@/lib/organization-auth';
import type {
    DailyStats,
    DashboardResponse,
    ChartDataPoint,
    DashboardStats,
    AggregatedModelComparisonDataPoint,
    AggregatedTrafficSourceOption,
    AggregatedModelFilterOption,
    SourceSummary,
    ModelSummary,
    CountrySummary,
} from '@/types/analytics-aggregated';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Organization Analytics API Route
 * 
 * Provides filtered analytics data for the organization dashboard.
 * Requires a valid organization API key.
 * 
 * Flow:
 * 1. Validate API key
 * 2. Identify models belonging to organization
 * 3. Filter all analytics data by these models
 * 4. Apply user filters (period, country, sources)
 */
export async function GET(
    request: NextRequest
): Promise<NextResponse<{ success: boolean; data?: DashboardResponse; error?: string }>> {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('key') || request.headers.get('authorization')?.split(' ')[1];

    if (!apiKey) {
        return NextResponse.json({ success: false, error: 'API key required' }, { status: 401 });
    }

    const startTime = Date.now();

    try {
        // 1. Validate Organization API Key
        const organization = await validateOrganizationKeyUncached(apiKey);
        if (!organization) {
            return NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 401 });
        }

        const organizationId = organization.id;

        // 2. Fetch models belonging to this organization
        const { data: orgModels, error: modelsError } = await supabase
            .from('models')
            .select('id, name, slug, image_url')
            .eq('organization_id', organizationId);

        if (modelsError) throw modelsError;

        if (!orgModels || orgModels.length === 0) {
            return NextResponse.json({
                success: true,
                data: emptyDashboardResponse(),
            });
        }

        const orgModelSlugs = (orgModels as unknown as any[]).map(m => m.slug);
        const orgModelIds = (orgModels as unknown as any[]).map(m => m.id);

        // 3. Parse and validate filters
        const queryParams = parseQueryParams(request, orgModelSlugs);
        let {
            startDate,
            endDate,
            prevStartDate,
            prevEndDate,
            models: modelFilterSlugs,
            sources: sourceNames,
            countries
        } = queryParams;

        // Ensure we only query models belonging to this organization
        const activeModelSlugs = modelFilterSlugs.length > 0
            ? modelFilterSlugs.filter(s => orgModelSlugs.includes(s))
            : orgModelSlugs;

        if (activeModelSlugs.length === 0) {
            return NextResponse.json({ success: true, data: emptyDashboardResponse() });
        }

        // 4. Resolve source filter names to IDs
        const [{ data: linksData }, { data: allSourcesData }] = await Promise.all([
            supabase.from('tracking_links').select('id, source_id').in('model_id', orgModelIds),
            supabase.from('traffic_sources').select('id, name, slug')
        ]);

        const sourceIdToName = new Map<string, string>();
        (allSourcesData || []).forEach(s => sourceIdToName.set(s.id, s.name));

        const sourceMap = new Map<string, string>(); // Link UUID -> Source Name
        const nameToLinkIds = new Map<string, string[]>(); // Source Name -> [Link UUIDs]

        (linksData || []).forEach((link: any) => {
            const name = sourceIdToName.get(link.source_id) || 'Unknown';
            sourceMap.set(link.id, name);

            const ids = nameToLinkIds.get(name) || [];
            ids.push(link.id);
            nameToLinkIds.set(name, ids);
        });

        sourceMap.set('organic', 'Organic');

        let sourceFilterIds: string[] = [];
        if (sourceNames.length > 0) {
            sourceNames.forEach(name => {
                if (name === 'Organic') {
                    sourceFilterIds.push('organic');
                } else {
                    const ids = nameToLinkIds.get(name) || [];
                    sourceFilterIds.push(...ids);
                }
            });
            if (sourceFilterIds.length === 0) {
                sourceFilterIds.push('00000000-0000-0000-0000-000000000000');
            }
        }

        // 5. Fetch data from materialized views
        const isHourly = (url.searchParams.get('period') || '30days') === 'hour';

        const [
            dailyStats,
            prevDailyStats,
        ] = await Promise.all([
            isHourly
                ? fetchHourlyStats(startDate, endDate, activeModelSlugs, sourceFilterIds, countries)
                : fetchDailyStats(startDate, endDate, activeModelSlugs, sourceFilterIds, countries),
            isHourly
                ? fetchHourlyStats(prevStartDate, prevEndDate, activeModelSlugs, sourceFilterIds, countries)
                : fetchDailyStats(prevStartDate, prevEndDate, activeModelSlugs, sourceFilterIds, countries),
        ]);

        // 6. Aggregate results
        const result = calculateOverallStats(dailyStats, prevDailyStats, sourceMap);
        const { modelMetrics, ...stats } = result;

        const chartData: ChartDataPoint[] = aggregateChartData(dailyStats, prevDailyStats);

        let modelComparison: AggregatedModelComparisonDataPoint[] | undefined;
        if (activeModelSlugs.length > 1) {
            const comparisonData = aggregateModelComparison(dailyStats, 'views');
            modelComparison = formatModelComparisonForChart(comparisonData, activeModelSlugs) as unknown as AggregatedModelComparisonDataPoint[];
        }

        const queryTime = Date.now() - startTime;

        // 7. Data lists for filters
        const availableCountries = [...new Set(dailyStats.map((e: any) => e.country).filter(Boolean))].sort() as string[];

        const availableSources: AggregatedTrafficSourceOption[] = (allSourcesData || []).map(source => ({
            id: source.id,
            name: source.name,
            slug: source.slug || source.name.toLowerCase().replace(/\s+/g, '-'),
            subtags: [], // Could be expanded if needed
        }));

        const availableModels: AggregatedModelFilterOption[] = (orgModels as unknown as any[]).map(model => ({
            id: model.id,
            name: model.name,
            slug: model.slug,
            imageUrl: model.image_url,
        }));

        const response: DashboardResponse = {
            stats,
            chartData,
            modelComparison,
            lastRefresh: { timestamp: new Date().toISOString(), duration_ms: 0, status: 'success' },
            queryTime,
            availableCountries,
            availableSources,
            availableModels,
        };

        return NextResponse.json({
            success: true,
            data: response,
        });

    } catch (error) {
        console.error('[Org Analytics API] error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch analytics',
            },
            { status: 500 }
        );
    }
}

// HELPER FUNCTIONS (Adapted from admin API)

function parseQueryParams(request: NextRequest, orgModelSlugs: string[]) {
    const url = new URL(request.url);
    const period = (url.searchParams.get('period') || '30days') as string;

    const now = new Date();
    let startDate: string;
    let endDate: string = now.toISOString().split('T')[0];
    let prevStartDate: string;
    let prevEndDate: string;

    const toDateStr = (date: Date) => date.toISOString().split('T')[0];

    switch (period) {
        case 'hour':
            startDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            endDate = now.toISOString();
            prevStartDate = new Date(now.getTime() - 120 * 60 * 1000).toISOString();
            prevEndDate = startDate;
            break;
        case 'today':
            startDate = toDateStr(now);
            prevStartDate = toDateStr(new Date(now.getTime() - 24 * 60 * 60 * 1000));
            prevEndDate = prevStartDate;
            break;
        case '7days':
            startDate = toDateStr(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
            prevStartDate = toDateStr(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));
            prevEndDate = toDateStr(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000));
            break;
        case '30days':
            startDate = toDateStr(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
            prevStartDate = toDateStr(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000));
            prevEndDate = toDateStr(new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000));
            break;
        case '90days':
            startDate = toDateStr(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
            prevStartDate = toDateStr(new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000));
            prevEndDate = toDateStr(new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000));
            break;
        case 'custom':
            startDate = url.searchParams.get('startDate') || toDateStr(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
            endDate = url.searchParams.get('endDate') || toDateStr(now);
            const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
            prevEndDate = toDateStr(new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000));
            prevStartDate = toDateStr(new Date(new Date(prevEndDate).getTime() - diff));
            break;
        default:
            startDate = toDateStr(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
            prevStartDate = toDateStr(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000));
            prevEndDate = toDateStr(new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000));
    }

    const models = url.searchParams.get('models')?.split(',').filter(Boolean) || [];
    let sources: string[] = [];
    const rawSources = url.searchParams.get('sources');
    if (rawSources) {
        try {
            const parsed = JSON.parse(rawSources);
            sources = parsed.map((s: any) => typeof s === 'string' ? s : s.source);
        } catch {
            sources = rawSources.split(',').filter(Boolean);
        }
    }

    const countries = [
        ...(url.searchParams.get('countries')?.split(',') || []),
        ...(url.searchParams.get('country')?.split(',') || [])
    ].filter(Boolean);

    return { startDate, endDate, prevStartDate, prevEndDate, models, sources, countries };
}

async function fetchDailyStats(
    startDate: string,
    endDate: string,
    models: string[],
    sources: string[],
    countries: string[]
): Promise<DailyStats[]> {
    const allData: DailyStats[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from('analytics_daily_stats')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .in('model_slug', models)
            .order('date', { ascending: true })
            .range(offset, offset + pageSize - 1);

        if (sources.length > 0) query = query.in('traffic_source', sources);
        if (countries.length > 0) query = query.in('country', countries);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
            allData.push(...data);
            if (data.length < pageSize) hasMore = false;
            else offset += pageSize;
        } else hasMore = false;
    }
    return allData;
}

async function fetchHourlyStats(
    startHour: string,
    endHour: string,
    models: string[],
    sources: string[],
    countries: string[]
): Promise<DailyStats[]> {
    const allData: DailyStats[] = [];
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from('analytics_hourly_stats')
            .select('hour, model_slug, tracking_link_id, country, views, clicks')
            .gte('hour', startHour)
            .lte('hour', endHour)
            .in('model_slug', models)
            .order('hour', { ascending: true })
            .range(offset, offset + pageSize - 1);

        if (sources.length > 0) query = query.in('tracking_link_id', sources);
        if (countries.length > 0) query = query.in('country', countries);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
            const mapped = data.map((d: any) => ({
                date: d.hour,
                model_slug: d.model_slug,
                country: d.country,
                traffic_source: d.tracking_link_id || 'organic',
                views: d.views,
                clicks: d.clicks,
                total_events: d.views + d.clicks
            }));
            allData.push(...mapped);
            if (data.length < pageSize) hasMore = false;
            else offset += pageSize;
        } else hasMore = false;
    }
    return allData;
}

function calculateOverallStats(currentStats: DailyStats[], prevStats: DailyStats[], sourceMap: Map<string, string>): DashboardStats {
    let totalViews = 0;
    let totalClicks = 0;
    const countryMap = new Map<string, { views: number; clicks: number }>();
    const modelMap = new Map<string, { views: number; clicks: number }>();
    const sourceNameMap = new Map<string, { views: number; clicks: number }>();

    currentStats.forEach(stat => {
        totalViews += stat.views;
        totalClicks += stat.clicks;
        const c = countryMap.get(stat.country) || { views: 0, clicks: 0 };
        countryMap.set(stat.country, { views: c.views + stat.views, clicks: c.clicks + stat.clicks });
        const m = modelMap.get(stat.model_slug) || { views: 0, clicks: 0 };
        modelMap.set(stat.model_slug, { views: m.views + stat.views, clicks: m.clicks + stat.clicks });
        const sourceName = sourceMap.get(stat.traffic_source) || stat.traffic_source;
        const s = sourceNameMap.get(sourceName) || { views: 0, clicks: 0 };
        sourceNameMap.set(sourceName, { views: s.views + stat.views, clicks: s.clicks + stat.clicks });
    });

    let prevViews = 0;
    let prevClicks = 0;
    prevStats.forEach(stat => {
        prevViews += stat.views;
        prevClicks += stat.clicks;
    });

    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
    };

    const modelMetrics: ModelSummary[] = Array.from(modelMap.entries()).map(([slug, stats]) => ({
        model_slug: slug,
        total_views: stats.views,
        total_clicks: stats.clicks,
        unique_countries: 0,
        active_days: 0,
        first_event: '',
        last_event: '',
        ctr_percentage: stats.views > 0 ? (stats.clicks / stats.views) * 100 : 0
    })).sort((a, b) => b.total_views - a.total_views);

    const sourceBreakdown: SourceSummary[] = Array.from(sourceNameMap.entries()).map(([name, stats]) => ({
        source_name: name,
        total_views: stats.views,
        total_clicks: stats.clicks,
        total_events: stats.views + stats.clicks,
        subtag_name: null, models_count: 0, countries_count: 0, first_event: '', last_event: ''
    })).sort((a, b) => b.total_views - a.total_views);

    const countryBreakdown: CountrySummary[] = Array.from(countryMap.entries()).map(([country, stats]) => ({
        country, total_views: stats.views, total_clicks: stats.clicks, total_events: stats.views + stats.clicks, models_visited: 0, active_days: 0
    })).sort((a, b) => b.total_views - a.total_views);

    return {
        totalViews, totalClicks, ctr, uniqueCountries: countryMap.size,
        visitsChange: calculateChange(totalViews, prevViews),
        clicksChange: calculateChange(totalClicks, prevClicks),
        topSources: sourceBreakdown, topCountries: countryBreakdown, topModels: modelMetrics.slice(0, 10),
        modelMetrics
    };
}

function aggregateChartData(currentStats: DailyStats[], prevStats: DailyStats[]): ChartDataPoint[] {
    const currentMap = new Map<string, { views: number; clicks: number }>();
    const prevMap = new Map<string, { views: number; clicks: number }>();
    currentStats.forEach(s => {
        const existing = currentMap.get(s.date) || { views: 0, clicks: 0 };
        currentMap.set(s.date, { views: existing.views + s.views, clicks: existing.clicks + s.clicks });
    });
    prevStats.forEach(s => {
        const existing = prevMap.get(s.date) || { views: 0, clicks: 0 };
        prevMap.set(s.date, { views: existing.views + s.views, clicks: existing.clicks + s.clicks });
    });
    const sortedCurrentDates = Array.from(currentMap.keys()).sort();
    const sortedPrevDates = Array.from(prevMap.keys()).sort();
    return sortedCurrentDates.map((date, index) => {
        const current = currentMap.get(date)!;
        const prevDate = sortedPrevDates[index];
        const prev = prevDate ? prevMap.get(prevDate) : null;
        return {
            date, views: current.views, clicks: current.clicks, visitsPrev: prev ? prev.views : 0, clicksPrev: prev ? prev.clicks : 0,
            label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
    });
}

function aggregateModelComparison(dailyStats: DailyStats[], metric: 'views' | 'clicks' = 'views'): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    dailyStats.forEach(stat => {
        if (!result[stat.date]) result[stat.date] = {};
        const currentValue = result[stat.date][stat.model_slug] || 0;
        result[stat.date][stat.model_slug] = currentValue + stat[metric];
    });
    return result;
}

function formatModelComparisonForChart(comparisonData: Record<string, Record<string, number>>, models: string[]): Array<Record<string, string | number>> {
    return Object.entries(comparisonData).map(([date, modelData]) => {
        const point: Record<string, string | number> = { date };
        models.forEach(model => { point[model] = modelData[model] || 0; });
        return point;
    }).sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
}

function emptyDashboardResponse(): DashboardResponse {
    return {
        stats: { totalViews: 0, totalClicks: 0, ctr: 0, uniqueCountries: 0, topSources: [], topCountries: [], topModels: [] },
        chartData: [],
        lastRefresh: { timestamp: new Date().toISOString(), duration_ms: 0, status: 'success' },
        queryTime: 0,
        availableCountries: [],
        availableSources: [],
        availableModels: [],
    };
}
