import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  DailyStats,
  SourceSummary,
  ModelSummary,
  CountrySummary,
  RefreshStatus,
  DashboardResponse,
  ChartDataPoint,
  DashboardStats,
  ModelComparisonDataPoint,
  TrafficSourceOption,
  ModelFilterOption,
} from '@/types/analytics-aggregated';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_KEY = process.env.ADMIN_KEY;

function verifyAdmin(request: NextRequest): boolean {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  return key === ADMIN_KEY;
}

// Parse query parameters and calculate date ranges
function parseQueryParams(request: NextRequest) {
  const url = new URL(request.url);
  const period = (url.searchParams.get('period') || '30days') as string;

  const now = new Date();
  let startDate: string;
  let endDate: string = now.toISOString().split('T')[0];
  let prevStartDate: string;
  let prevEndDate: string;

  // Helper to get ISO date string (YYYY-MM-DD)
  const toDateStr = (date: Date) => date.toISOString().split('T')[0];

  switch (period) {
    case 'hour':
      // Last 1 hour with full ISO granularity
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
    case 'all':
      startDate = '2024-01-01'; // Default start of data
      prevStartDate = startDate; // No previous for "all"
      prevEndDate = startDate;
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

  // Handle both JSON string and comma-separated sources
  let sources: string[] = [];
  const rawSources = url.searchParams.get('sources');
  if (rawSources) {
    if (rawSources.startsWith('[') && rawSources.endsWith(']')) {
      try {
        const parsed = JSON.parse(rawSources);
        sources = parsed.map((s: any) => typeof s === 'string' ? s : s.source);
      } catch (e) {
        sources = rawSources.split(',').filter(Boolean);
      }
    } else {
      sources = rawSources.split(',').filter(Boolean);
    }
  }

  const countries = [
    ...(url.searchParams.get('countries')?.split(',') || []),
    ...(url.searchParams.get('country')?.split(',') || [])
  ].filter(Boolean);

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    models,
    sources,
    countries
  };
}

// Fetch all daily stats from materialized view using pagination
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
      .order('date', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    if (models.length > 0) {
      query = query.in('model_slug', models);
    }

    if (sources.length > 0) {
      query = query.in('traffic_source', sources);
    }

    if (countries.length > 0) {
      query = query.in('country', countries);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}

// Fetch all hourly stats from materialized view
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
      .order('hour', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    if (models.length > 0) {
      query = query.in('model_slug', models);
    }

    if (sources.length > 0) {
      // For hourly view, traffic_source is stored as tracking_link_id
      query = query.in('tracking_link_id', sources);
    }

    if (countries.length > 0) {
      query = query.in('country', countries);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      // Map hourly structure to DailyStats structure for aggregation compatibility
      const mapped = data.map((d: any) => ({
        date: d.hour, // Use full timestamp string as 'date' for hourly chart labels
        model_slug: d.model_slug,
        country: d.country,
        traffic_source: d.tracking_link_id || 'organic',
        views: d.views,
        clicks: d.clicks,
        total_events: d.views + d.clicks
      }));

      allData.push(...mapped);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}

// Fetch source summary from materialized view
async function fetchSourceSummary(): Promise<SourceSummary[]> {
  const { data, error } = await supabase
    .from('analytics_source_summary')
    .select('*')
    .order('total_events', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching source summary:', error);
    throw error;
  }

  return data || [];
}

// Fetch model summary from materialized view
async function fetchModelSummary(models?: string[]): Promise<ModelSummary[]> {
  let query = supabase
    .from('analytics_model_summary')
    .select('*')
    .order('total_views', { ascending: false });

  if (models && models.length > 0) {
    query = query.in('model_slug', models);
  } else {
    query = query.limit(20);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching model summary:', error);
    throw error;
  }

  return data || [];
}

// Fetch country summary from materialized view
async function fetchCountrySummary(countries?: string[]): Promise<CountrySummary[]> {
  let query = supabase
    .from('analytics_country_summary')
    .select('*')
    .order('total_events', { ascending: false });

  if (countries && countries.length > 0) {
    query = query.in('country', countries);
  } else {
    query = query.limit(20);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching country summary:', error);
    throw error;
  }

  return data || [];
}

// Fetch last refresh status
async function fetchRefreshStatus(): Promise<RefreshStatus> {
  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'analytics_last_refresh')
    .single();

  if (error) {
    // Return default if not found
    return {
      timestamp: null,
      duration_ms: null,
      status: 'never',
    };
  }

  return data.value as RefreshStatus;
}

// ============================================
// AGGREGATION FUNCTIONS
// ============================================

// Aggregate daily stats into chart data (current and previous)
function aggregateChartData(
  currentStats: DailyStats[],
  prevStats: DailyStats[]
): ChartDataPoint[] {
  const currentMap = new Map<string, { views: number; clicks: number }>();
  const prevMap = new Map<string, { views: number; clicks: number }>();

  // Aggregate current
  currentStats.forEach(s => {
    const existing = currentMap.get(s.date) || { views: 0, clicks: 0 };
    currentMap.set(s.date, { views: existing.views + s.views, clicks: existing.clicks + s.clicks });
  });

  // Aggregate previous
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
      date,
      views: current.views,
      clicks: current.clicks,
      visitsPrev: prev ? prev.views : 0,
      clicksPrev: prev ? prev.clicks : 0
    };
  });
}

// Calculate overall stats and per-model stats from daily data including comparison
function calculateOverallStats(
  currentStats: DailyStats[],
  prevStats: DailyStats[],
  sourceMap: Map<string, string> // UUID -> Source Name
): DashboardStats {
  // Current period totals
  let totalViews = 0;
  let totalClicks = 0;
  const countryMap = new Map<string, { views: number; clicks: number }>();
  const modelMap = new Map<string, { views: number; clicks: number }>();
  const sourceNameMap = new Map<string, { views: number; clicks: number }>();

  currentStats.forEach(stat => {
    totalViews += stat.views;
    totalClicks += stat.clicks;

    // Country Aggregation
    const c = countryMap.get(stat.country) || { views: 0, clicks: 0 };
    countryMap.set(stat.country, { views: c.views + stat.views, clicks: c.clicks + stat.clicks });

    // Model Aggregation
    const m = modelMap.get(stat.model_slug) || { views: 0, clicks: 0 };
    modelMap.set(stat.model_slug, { views: m.views + stat.views, clicks: m.clicks + stat.clicks });

    // Source Aggregation (Grouping by Name)
    const sourceName = sourceMap.get(stat.traffic_source) || stat.traffic_source;
    const s = sourceNameMap.get(sourceName) || { views: 0, clicks: 0 };
    sourceNameMap.set(sourceName, { views: s.views + stat.views, clicks: s.clicks + stat.clicks });
  });

  // Previous period totals
  let prevViews = 0;
  let prevClicks = 0;
  prevStats.forEach(stat => {
    prevViews += stat.views;
    prevClicks += stat.clicks;
  });

  const ctr = totalViews > 0
    ? Math.round((totalClicks / totalViews) * 10000) / 100
    : 0;

  // Calculate percentage changes
  const calculateChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Create model metrics for sidebar (filtered)
  const modelMetrics: ModelSummary[] = Array.from(modelMap.entries()).map(([slug, stats]) => ({
    model_slug: slug,
    total_views: stats.views,
    total_clicks: stats.clicks,
    unique_countries: 0,
    active_days: 0,
    first_event: '',
    last_event: '',
    ctr_percentage: stats.views > 0 ? Math.round((stats.clicks / stats.views) * 10000) / 100 : 0
  } as ModelSummary)).sort((a, b) => b.total_views - a.total_views);

  // Create source breakdown
  const sourceMetrics: SourceSummary[] = Array.from(sourceNameMap.entries()).map(([name, stats]) => ({
    source_name: name,
    total_views: stats.views,
    total_clicks: stats.clicks,
    total_events: stats.views + stats.clicks,
    subtag_name: null,
    models_count: 0,
    countries_count: 0,
    first_event: '',
    last_event: ''
  } as SourceSummary)).sort((a, b) => b.total_views - a.total_views);

  // Create country breakdown
  const countryMetrics: CountrySummary[] = Array.from(countryMap.entries()).map(([country, stats]) => ({
    country,
    total_views: stats.views,
    total_clicks: stats.clicks,
    total_events: stats.views + stats.clicks,
    models_visited: 0,
    active_days: 0
  } as CountrySummary)).sort((a, b) => b.total_views - a.total_views);

  return {
    totalViews,
    totalClicks,
    ctr,
    uniqueCountries: countryMap.size,
    visitsChange: calculateChange(totalViews, prevViews),
    clicksChange: calculateChange(totalClicks, prevClicks),
    topSources: sourceMetrics,
    topCountries: countryMetrics,
    topModels: modelMetrics.slice(0, 10),
    modelMetrics
  };
}

// Aggregate daily stats into model comparison data
function aggregateModelComparison(
  dailyStats: DailyStats[],
  metric: 'views' | 'clicks' = 'views'
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  dailyStats.forEach(stat => {
    if (!result[stat.date]) {
      result[stat.date] = {};
    }

    const currentValue = result[stat.date][stat.model_slug] || 0;
    result[stat.date][stat.model_slug] = currentValue + stat[metric];
  });

  return result;
}

// Format model comparison data for chart
function formatModelComparisonForChart(
  comparisonData: Record<string, Record<string, number>>,
  models: string[]
): Array<Record<string, string | number>> {
  return Object.entries(comparisonData)
    .map(([date, modelData]) => {
      const point: Record<string, string | number> = { date };
      models.forEach(model => {
        point[model] = modelData[model] || 0;
      });
      return point;
    })
    .sort((a, b) =>
      new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
    );
}


// ============================================
// GET HANDLER
// ============================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; data?: DashboardResponse; error?: string }>> {
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    // Parse query parameters
    const queryParams = parseQueryParams(request);
    let {
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      models,
      sources: sourceNames,
      countries
    } = queryParams;

    // 1. Fetch source mapping and link mapping
    const [{ data: linksData }, { data: allSourcesData }] = await Promise.all([
      supabase.from('tracking_links').select('id, source_id'),
      supabase.from('traffic_sources').select('id, name')
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

    // 2. Resolve source filter names to IDs if filtering
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

      // If we are filtering by a name that has no links, use a dummy UUID 
      // to ensure the query returns 0 records instead of returning everything.
      if (sourceFilterIds.length === 0) {
        sourceFilterIds.push('00000000-0000-0000-0000-000000000000');
      }
    }

    // Fetch data from materialized views in parallel
    const isHourly = (url.searchParams.get('period') || '30days') === 'hour';

    const [
      dailyStats,
      prevDailyStats,
      refreshStatus,
    ] = await Promise.all([
      isHourly
        ? fetchHourlyStats(startDate, endDate, models, sourceFilterIds, countries)
        : fetchDailyStats(startDate, endDate, models, sourceFilterIds, countries),
      isHourly
        ? fetchHourlyStats(prevStartDate, prevEndDate, models, sourceFilterIds, countries)
        : fetchDailyStats(prevStartDate, prevEndDate, models, sourceFilterIds, countries),
      fetchRefreshStatus(),
    ]);

    // Calculate aggregated stats with comparison data
    const result = calculateOverallStats(
      dailyStats,
      prevDailyStats,
      sourceMap
    );

    const { modelMetrics, ...stats } = result;

    // Generate chart data merge
    const chartData: ChartDataPoint[] = aggregateChartData(dailyStats, prevDailyStats);

    // Generate model comparison data if multiple models selected
    let modelComparison: ModelComparisonDataPoint[] | undefined;
    if (models.length > 1) {
      const comparisonData = aggregateModelComparison(dailyStats, 'views');
      modelComparison = formatModelComparisonForChart(comparisonData, models) as unknown as ModelComparisonDataPoint[];
    }

    const queryTime = Date.now() - startTime;

    // Check if refresh is needed (more than 1 hour old)
    const lastRefreshTime = refreshStatus.timestamp
      ? new Date(refreshStatus.timestamp).getTime()
      : 0;
    const refreshAgeMinutes = Math.floor((Date.now() - lastRefreshTime) / 60000);

    // Add warning if data is stale
    const refreshWarning = refreshAgeMinutes > 60
      ? `Data may be stale (last refresh: ${refreshAgeMinutes} minutes ago)`
      : undefined;

    // 7. Fetch Available Lists for Filters
    const [
      { data: allCountriesData },
      { data: sourcesData },
      { data: modelsData }
    ] = await Promise.all([
      supabase
        .from('analytics_events')
        .select('country')
        .not('country', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('traffic_sources')
        .select('*, subtags:tracking_subtags(*)'),
      supabase
        .from('models')
        .select('id, name, slug, image_url')
    ]);

    const availableCountries = [...new Set(allCountriesData?.map((e: any) => e.country).filter(Boolean))].sort() as string[];

    const availableSources: TrafficSourceOption[] = (sourcesData || []).map(source => ({
      id: source.id,
      name: source.name,
      slug: source.slug,
      subtags: source.subtags?.map((st: any) => ({
        id: st.id,
        name: st.name,
        slug: st.slug,
      })) || [],
    }));

    const availableModels: ModelFilterOption[] = (modelsData || []).map(model => ({
      id: model.id,
      name: model.name,
      slug: model.slug,
      imageUrl: model.image_url,
    }));

    const response: DashboardResponse = {
      stats,
      chartData,
      modelComparison,
      lastRefresh: refreshStatus,
      queryTime,
      availableCountries,
      availableSources,
      availableModels,
    };

    return NextResponse.json({
      success: true,
      data: response,
      ...(refreshWarning && { warning: refreshWarning }),
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
      },
      { status: 500 }
    );
  }
}


// ============================================
// POST HANDLER (for triggering refresh from dashboard)
// ============================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  if (!verifyAdmin(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Trigger refresh via the dedicated endpoint logic
    const { data, error } = await supabase.rpc('refresh_analytics_views');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh views',
      },
      { status: 500 }
    );
  }
}
