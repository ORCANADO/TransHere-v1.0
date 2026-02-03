export const runtime = 'edge';
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
  AggregatedModelComparisonDataPoint,
  AggregatedTrafficSourceOption,
  AggregatedModelFilterOption,
} from '@/types/analytics-aggregated';
import type { SourceOption } from '@/types/analytics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_KEY = process.env.ADMIN_KEY;

// Static available sources for filter dropdown
const AVAILABLE_SOURCES: SourceOption[] = [
  { name: 'Organic', value: 'organic', icon: 'Globe' },
  { name: 'Instagram', value: 'instagram', icon: 'Instagram' },
  { name: 'X', value: 'x', icon: 'Twitter' },
  { name: 'Reddit', value: 'reddit', icon: 'Users' },
  { name: 'Model Directory', value: 'model-directory', icon: 'ExternalLink' },
  { name: 'OnlyFans', value: 'onlyfans', icon: 'Heart' },
  { name: 'Fansly', value: 'fansly', icon: 'Cloud' },
];

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
      // Last 1 hour with full ISO granularity, truncated to start of hour
      // to avoid missing the current hourly bucket in materialized views
      const hourStart = new Date(now);
      hourStart.setMinutes(0, 0, 0);
      startDate = new Date(hourStart.getTime() - 60 * 60 * 1000).toISOString();
      endDate = now.toISOString();
      prevStartDate = new Date(hourStart.getTime() - 120 * 60 * 1000).toISOString();
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

  // Handle model selection - both JSON string and comma-separated
  let models: string[] = [];
  const modelSlugsParam = url.searchParams.get('modelSlugs') || url.searchParams.get('models');
  if (modelSlugsParam) {
    if (modelSlugsParam.startsWith('[') && modelSlugsParam.endsWith(']')) {
      try {
        models = JSON.parse(modelSlugsParam);
      } catch (e) {
        models = modelSlugsParam.split(',').filter(Boolean);
      }
    } else {
      models = modelSlugsParam.split(',').filter(Boolean);
    }
  }

  // Handle both JSON string and comma-separated sources
  // Also extract subtag filters from SourceFilter objects
  let sources: string[] = [];
  let subtagFilters: Map<string, string[]> = new Map(); // source name -> subtag names
  const rawSources = url.searchParams.get('sources');
  if (rawSources) {
    if (rawSources.startsWith('[') && rawSources.endsWith(']')) {
      try {
        const parsed = JSON.parse(rawSources);
        sources = parsed.map((s: any) => typeof s === 'string' ? s : s.source);
        // Extract subtag filters from SourceFilter objects
        parsed.forEach((s: any) => {
          if (typeof s !== 'string' && s.subtags && s.subtags.length > 0) {
            subtagFilters.set(s.source.toLowerCase(), s.subtags);
          }
        });
      } catch (e) {
        sources = rawSources.split(',').filter(Boolean);
      }
    } else {
      sources = rawSources.split(',').filter(Boolean);
    }
  }

  // Handle countries - both JSON string and comma-separated
  let countries: string[] = [];
  const countriesParam = url.searchParams.get('countries') || url.searchParams.get('country');
  if (countriesParam) {
    if (countriesParam.startsWith('[') && countriesParam.endsWith(']')) {
      try {
        countries = JSON.parse(countriesParam);
      } catch (e) {
        countries = countriesParam.split(',').filter(Boolean);
      }
    } else {
      countries = countriesParam.split(',').filter(Boolean);
    }
  }

  return {
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
    models,
    sources,
    subtagFilters,
    countries
  };
}

// Fetch all daily stats from materialized view using pagination
async function fetchDailyStats(
  startDate: string,
  endDate: string,
  models: string[],
  sources: string[] | undefined,
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
      .order('model_slug', { ascending: true })
      .order('traffic_source', { ascending: true })
      .order('country', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    if (models.length > 0) {
      query = query.in('model_slug', models);
    }

    if (sources && sources.length > 0) {
      query = query.in('traffic_source', sources);
    } else if (sources && sources.length === 0) {
      // If sources were explicitly passed as empty array (meaning no matching links found)
      // but the filter was originally requested, we should return nothing.
      // We'll use a dummy UUID to ensure 0 results.
      query = query.eq('traffic_source', '00000000-0000-0000-0000-000000000000');
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
  sources: string[] | undefined,
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
      .order('model_slug', { ascending: true })
      .order('tracking_link_id', { ascending: true })
      .order('country', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    if (models.length > 0) {
      query = query.in('model_slug', models);
    }

    if (sources && sources.length > 0) {
      // For hourly view, traffic_source is stored as tracking_link_id
      query = query.in('tracking_link_id', sources);
    } else if (sources && sources.length === 0) {
      // If sources were requested but none found, return 0 results
      query = query.eq('tracking_link_id', '00000000-0000-0000-0000-000000000000');
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

// Add after fetchModelSummary function (around line 180)
async function fetchAllModelMetrics(
  startDate: string,
  endDate: string,
  isHourly: boolean,
  sources: string[] | undefined,
  countries: string[]
): Promise<ModelSummary[]> {
  const allData: any[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  const table = isHourly ? 'analytics_hourly_stats' : 'analytics_daily_stats';
  const dateField = isHourly ? 'hour' : 'date';

  // If daily, ensure we compare dates correctly by trimming to YYYY-MM-DD
  const effectiveStart = isHourly ? startDate : startDate.split('T')[0];
  const effectiveEnd = isHourly ? endDate : endDate.split('T')[0];

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(`model_slug, views, clicks, ${dateField}`)
      .gte(dateField, effectiveStart)
      .lte(dateField, effectiveEnd);

    // Apply filters
    if (sources && sources.length > 0) {
      const sourceCol = table === 'analytics_daily_stats' ? 'traffic_source' : 'tracking_link_id';
      query = query.in(sourceCol, sources);
    } else if (sources && sources.length === 0) {
      const sourceCol = table === 'analytics_daily_stats' ? 'traffic_source' : 'tracking_link_id';
      query = query.eq(sourceCol, '00000000-0000-0000-0000-000000000000');
    }

    if (countries.length > 0) {
      query = query.in('country', countries);
    }

    query = query
      .order(dateField, { ascending: true })
      .order('model_slug', { ascending: true });

    // For stable pagination, add more columns if possible
    if (table === 'analytics_daily_stats') {
      query = query.order('traffic_source', { ascending: true }).order('country', { ascending: true });
    } else {
      query = query.order('tracking_link_id', { ascending: true }).order('country', { ascending: true });
    }

    const { data, error } = await query.range(offset, offset + pageSize - 1);

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

  // Aggregate by model
  const modelMap = new Map<string, { views: number; clicks: number }>();
  allData.forEach((row: any) => {
    const existing = modelMap.get(row.model_slug) || { views: 0, clicks: 0 };
    modelMap.set(row.model_slug, {
      views: existing.views + row.views,
      clicks: existing.clicks + row.clicks,
    });
  });

  return Array.from(modelMap.entries()).map(([slug, stats]) => ({
    model_slug: slug,
    total_views: stats.views,
    total_clicks: stats.clicks,
    ctr_percentage: stats.views > 0 ? Math.round((stats.clicks / stats.views) * 10000) / 100 : 0,
    unique_countries: 0,
    active_days: 0,
    first_event: '',
    last_event: '',
  }));
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
  let mainLayoutVisits = 0;
  let trackingLinkVisits = 0;
  const countryMap = new Map<string, { views: number; clicks: number }>();
  const modelMap = new Map<string, { views: number; clicks: number }>();
  const sourceNameMap = new Map<string, { views: number; clicks: number }>();

  currentStats.forEach(stat => {
    totalViews += stat.views;
    totalClicks += stat.clicks;

    // Traffic breakdown
    if (stat.traffic_source === 'organic') {
      mainLayoutVisits += stat.views;
    } else {
      trackingLinkVisits += stat.views;
    }

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
    mainLayoutVisits,
    trackingLinkVisits,
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
      subtagFilters,
      countries
    } = queryParams;

    // ============================================
    // SOURCE FILTER RESOLUTION (CASE-INSENSITIVE)
    // ============================================

    // 1. Fetch source mapping, link mapping, and subtags
    const [{ data: linksData }, { data: allSourcesData }, { data: allSubtagsData }] = await Promise.all([
      supabase.from('tracking_links').select('id, source_id, subtag_id'),
      supabase.from('tracking_sources').select('id, name, slug'),
      supabase.from('tracking_subtags').select('id, name, slug, source_id')
    ]);

    // Build case-insensitive lookup maps
    const sourceIdToName = new Map<string, string>();
    const sourceNameToId = new Map<string, string>(); // name (lowercase) -> source UUID
    const sourceSlugToId = new Map<string, string>(); // slug -> source UUID

    (allSourcesData || []).forEach(s => {
      sourceIdToName.set(s.id, s.name);
      sourceNameToId.set(s.name.toLowerCase(), s.id);
      if (s.slug) {
        sourceSlugToId.set(s.slug.toLowerCase(), s.id);
      }
    });

    // Build tracking link mappings
    const sourceMap = new Map<string, string>(); // Link UUID -> Source Name
    const sourceIdToLinkIds = new Map<string, string[]>(); // Source UUID -> [Link UUIDs]
    const nameToLinkIds = new Map<string, string[]>(); // Source Name (lowercase) -> [Link UUIDs]

    (linksData || []).forEach((link: any) => {
      const sourceName = sourceIdToName.get(link.source_id) || 'Unknown';
      sourceMap.set(link.id, sourceName);

      // Map by source_id
      const idsBySourceId = sourceIdToLinkIds.get(link.source_id) || [];
      idsBySourceId.push(link.id);
      sourceIdToLinkIds.set(link.source_id, idsBySourceId);

      // Map by name (lowercase for case-insensitive matching)
      const nameLower = sourceName.toLowerCase();
      const idsByName = nameToLinkIds.get(nameLower) || [];
      idsByName.push(link.id);
      nameToLinkIds.set(nameLower, idsByName);
    });

    sourceMap.set('organic', 'Organic');

    // Build subtag lookup: subtag name (lowercase) -> subtag ID
    const subtagNameToId = new Map<string, string>();
    const subtagIdToSourceId = new Map<string, string>();
    (allSubtagsData || []).forEach((st: any) => {
      subtagNameToId.set(`${st.source_id}:${st.name.toLowerCase()}`, st.id);
      subtagIdToSourceId.set(st.id, st.source_id);
    });

    // 2. Resolve source filter names to tracking_link IDs
    let sourceFilterIds: string[] | undefined = undefined;
    if (sourceNames.length > 0) {
      sourceFilterIds = [];
      sourceNames.forEach(name => {
        const nameLower = name.toLowerCase();

        // Handle "Organic" / "Direct" specially
        if (nameLower === 'organic' || nameLower === 'direct') {
          sourceFilterIds!.push('organic');
          return;
        }

        // Try matching by name (case-insensitive)
        let linkIds = nameToLinkIds.get(nameLower);

        // Fallback: try matching by slug
        if (!linkIds || linkIds.length === 0) {
          const sourceId = sourceSlugToId.get(nameLower);
          if (sourceId) {
            linkIds = sourceIdToLinkIds.get(sourceId);
          }
        }

        // Fallback: try partial name match (e.g., "Twitter/X" matches "twitter")
        if (!linkIds || linkIds.length === 0) {
          for (const [mapName, ids] of nameToLinkIds.entries()) {
            if (mapName.includes(nameLower) || nameLower.includes(mapName)) {
              linkIds = ids;
              break;
            }
          }
        }

        // Check if subtag filters exist for this source
        const subtagNames = subtagFilters.get(nameLower);
        if (subtagNames && subtagNames.length > 0 && linkIds && linkIds.length > 0) {
          // Resolve subtag names to IDs for this source
          const sourceId = sourceNameToId.get(nameLower) || sourceSlugToId.get(nameLower);
          if (sourceId) {
            const subtagIds = new Set<string>();
            subtagNames.forEach(stName => {
              const key = `${sourceId}:${stName.toLowerCase()}`;
              const stId = subtagNameToId.get(key);
              if (stId) subtagIds.add(stId);
            });

            // Filter link IDs to only those with matching subtags
            if (subtagIds.size > 0) {
              const filteredLinks = (linksData || []).filter((link: any) =>
                link.source_id === sourceId && link.subtag_id && subtagIds.has(link.subtag_id)
              ).map((link: any) => link.id);
              sourceFilterIds!.push(...filteredLinks);
              return; // Skip adding all linkIds for this source
            }
          }
        }

        if (linkIds && linkIds.length > 0) {
          sourceFilterIds!.push(...linkIds);
        }
      });

      // Debug logging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Dashboard API] Source Resolution Debug:', {
          requestedSources: sourceNames,
          resolvedLinkIds: sourceFilterIds.length,
          availableSourceNames: Array.from(nameToLinkIds.keys()),
        });
      }

      // CRITICAL: If no matching links found, DON'T use dummy UUID
      // Instead, filter by source_id directly if the view supports it
      if (sourceFilterIds.length === 0) {
        console.warn(`[Dashboard API] No tracking links found for sources: ${sourceNames.join(', ')}`);
        // Return empty dataset intentionally - better than dummy UUID
        // The frontend should show "No data for selected sources"
      }
    }

    // Fetch data from materialized views in parallel
    const isHourly = (url.searchParams.get('period') || '30days') === 'hour';

    const [
      dailyStats,
      prevDailyStats,
      refreshStatus,
      allModelMetricsRaw,
    ] = await Promise.all([
      isHourly
        ? fetchHourlyStats(startDate, endDate, models, sourceFilterIds, countries)
        : fetchDailyStats(startDate, endDate, models, sourceFilterIds, countries),
      isHourly
        ? fetchHourlyStats(prevStartDate, prevEndDate, models, sourceFilterIds, countries)
        : fetchDailyStats(prevStartDate, prevEndDate, models, sourceFilterIds, countries),
      fetchRefreshStatus(),
      fetchAllModelMetrics(startDate, endDate, isHourly, sourceFilterIds, countries),
    ]);

    // Check if we have source filters but no results
    const hasSourceFilter = sourceNames.length > 0;
    const noMatchingLinks = hasSourceFilter && (sourceFilterIds?.length === 0);

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
    let modelComparisonViews: AggregatedModelComparisonDataPoint[] | undefined;
    let modelComparisonClicks: AggregatedModelComparisonDataPoint[] | undefined;
    if (models.length > 1) {
      const viewsData = aggregateModelComparison(dailyStats, 'views');
      modelComparisonViews = formatModelComparisonForChart(viewsData, models) as unknown as AggregatedModelComparisonDataPoint[];

      const clicksData = aggregateModelComparison(dailyStats, 'clicks');
      modelComparisonClicks = formatModelComparisonForChart(clicksData, models) as unknown as AggregatedModelComparisonDataPoint[];
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
      { data: modelsData }
    ] = await Promise.all([
      supabase
        .from('analytics_events')
        .select('country')
        .not('country', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('models')
        .select('id, name, slug, image_url')
    ]);

    const availableCountries = [...new Set(allCountriesData?.map((e: any) => e.country).filter(Boolean))].sort() as string[];

    // Build available sources with subtag data
    const availableSources = AVAILABLE_SOURCES.map(src => {
      const sourceId = sourceNameToId.get(src.name.toLowerCase());
      const subtags = sourceId
        ? (allSubtagsData || [])
            .filter((st: any) => st.source_id === sourceId)
            .map((st: any) => ({ id: st.id, name: st.name, slug: st.slug }))
        : [];
      return { ...src, subtags };
    }) as any;

    // Also add any dynamic sources (custom ones not in AVAILABLE_SOURCES)
    const staticNames = new Set(AVAILABLE_SOURCES.map(s => s.name.toLowerCase()));
    (allSourcesData || []).forEach((s: any) => {
      if (!staticNames.has(s.name.toLowerCase())) {
        const subtags = (allSubtagsData || [])
          .filter((st: any) => st.source_id === s.id)
          .map((st: any) => ({ id: st.id, name: st.name, slug: st.slug }));
        availableSources.push({ name: s.name, value: s.slug, icon: 'Link2', subtags });
      }
    });

    const availableModels: AggregatedModelFilterOption[] = (modelsData || []).map(model => ({
      id: model.id,
      name: model.name,
      slug: model.slug,
      imageUrl: model.image_url,
    }));

    const response: DashboardResponse = {
      stats,
      chartData,
      modelComparisonViews,
      modelComparisonClicks,
      lastRefresh: refreshStatus,
      queryTime,
      availableCountries,
      availableSources,
      availableModels,
      allModelMetrics: allModelMetricsRaw,

      // Add debug info for empty results
      ...(sourceFilterIds?.length === 0 && sourceNames.length > 0 && {
        debug: {
          message: 'No tracking links found for selected sources',
          requestedSources: sourceNames,
          availableSources: Array.from(nameToLinkIds.keys()),
        } as any
      }),
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
