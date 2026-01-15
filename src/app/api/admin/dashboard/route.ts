import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type {
  DashboardData,
  OverviewStats,
  ModelAnalytics,
  ChartDataPoint,
  TimePeriod
} from '@/types/analytics';
import type {
  ComparisonDataPoint,
  ModelComparisonDataPoint,
  TrafficSourceOption,
  ModelFilterOption
} from '@/types/charts';

export const runtime = 'edge';

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

// Helper to get date range based on period (UTC focused)
function getDateRange(period: TimePeriod, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (period) {
    case 'hour':
      start.setHours(start.getHours() - 1);
      break;
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case '7days':
      start.setDate(start.getDate() - 7);
      break;
    case '30days':
      start.setDate(start.getDate() - 30);
      break;
    case '90days':
      start.setDate(start.getDate() - 90);
      break;
    case 'all':
      start.setFullYear(2020);
      break;
    case 'custom':
      if (startDate && endDate) {
        return {
          start: new Date(startDate),
          end: new Date(endDate)
        };
      }
      start.setDate(start.getDate() - 7);
      break;
  }

  return { start, end };
}

// Helper to format date for grouping
function formatDateForGrouping(date: string, period: TimePeriod): string {
  const d = new Date(date);
  if (period === 'hour') {
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  }
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Helper to format date label for display
function formatDateLabel(date: string, period: TimePeriod): string {
  const d = new Date(date);
  if (period === 'hour') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (period === 'today') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Generate model comparison data for chart
 * Returns data points with each model's metrics as separate keys
 */
function generateModelComparisonData(
  events: any[],
  modelSlugs: string[],
  startDate: Date,
  endDate: Date
): ModelComparisonDataPoint[] {
  // Group events by date and model
  const dateModelMap = new Map<string, Map<string, { views: number; clicks: number }>>();

  events.forEach(event => {
    if (!event.model_slug || !modelSlugs.includes(event.model_slug)) return;

    const dateKey = new Date(event.created_at).toISOString().split('T')[0];

    if (!dateModelMap.has(dateKey)) {
      dateModelMap.set(dateKey, new Map());
    }

    const modelMap = dateModelMap.get(dateKey)!;
    if (!modelMap.has(event.model_slug)) {
      modelMap.set(event.model_slug, { views: 0, clicks: 0 });
    }

    const stats = modelMap.get(event.model_slug)!;
    if (event.event_type === 'page_view') stats.views++;
    if (event.event_type === 'link_click') stats.clicks++;
  });

  // Generate data points for all dates in range
  const result: ModelComparisonDataPoint[] = [];
  const currentDate = new Date(startDate);
  // Ensure we don't go past end date, strip time for comparison
  const endDateTime = new Date(endDate);
  endDateTime.setHours(0, 0, 0, 0);

  // Create a working date starting from start date (time stripped)
  const workingDate = new Date(startDate);
  workingDate.setHours(0, 0, 0, 0);

  // Limit loop to prevent infinite loops if dates are wrong
  let safety = 0;
  while (workingDate <= endDateTime && safety < 366) {
    const dateKey = workingDate.toISOString().split('T')[0];
    const modelStats = dateModelMap.get(dateKey);

    const dataPoint: ModelComparisonDataPoint = {
      date: dateKey,
      label: workingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    // Add each model's data
    modelSlugs.forEach(slug => {
      const stats = modelStats?.get(slug) || { views: 0, clicks: 0 };
      // Use slug as key, store views by default (frontend switches between views/clicks)
      dataPoint[slug] = stats.views;
      dataPoint[`${slug}_clicks`] = stats.clicks;
    });

    result.push(dataPoint);
    workingDate.setDate(workingDate.getDate() + 1);
    safety++;
  }

  return result;
}

/**
 * Generate current vs previous period comparison data
 */
function generateComparisonData(
  events: any[],
  startDate: Date,
  endDate: Date
): ComparisonDataPoint[] {
  const periodDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const previousStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousEnd = new Date(startDate.getTime() - 1); // Up to just before start

  // Group current period by date
  const currentMap = new Map<string, { views: number; clicks: number }>();
  const previousMap = new Map<string, { views: number; clicks: number }>();

  events.forEach(event => {
    const eventDate = new Date(event.created_at);
    // Strip time for key
    const dateKey = eventDate.toISOString().split('T')[0];

    // Determine if current or previous period
    if (eventDate >= startDate && eventDate <= endDate) {
      if (!currentMap.has(dateKey)) {
        currentMap.set(dateKey, { views: 0, clicks: 0 });
      }
      const stats = currentMap.get(dateKey)!;
      if (event.event_type === 'page_view') stats.views++;
      if (event.event_type === 'link_click') stats.clicks++;
    } else if (eventDate >= previousStart && eventDate <= previousEnd) {
      // For previous period, we need to map it to the corresponding day index
      // But here we just count totals per date key
      const prevDateKey = dateKey;
      if (!previousMap.has(prevDateKey)) {
        previousMap.set(prevDateKey, { views: 0, clicks: 0 });
      }
      const stats = previousMap.get(prevDateKey)!;
      if (event.event_type === 'page_view') stats.views++;
      if (event.event_type === 'link_click') stats.clicks++;
    }
  });

  // Generate comparison points
  const result: ComparisonDataPoint[] = [];
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const endDateTime = new Date(endDate);
  endDateTime.setHours(0, 0, 0, 0);

  let dayIndex = 0;
  let safety = 0;

  while (currentDate <= endDateTime && safety < 366) {
    const currentKey = currentDate.toISOString().split('T')[0];
    const previousDate = new Date(previousStart.getTime());
    previousDate.setHours(0, 0, 0, 0);
    previousDate.setDate(previousDate.getDate() + dayIndex);

    const previousKey = previousDate.toISOString().split('T')[0];

    const currentStats = currentMap.get(currentKey) || { views: 0, clicks: 0 };
    // We need to find the stats for the constructed previousKey from our previous period scan
    // But our previous period scan just filled the map with actual dates.
    // So looking up previousKey works.
    const previousStats = previousMap.get(previousKey) || { views: 0, clicks: 0 };

    result.push({
      date: currentKey,
      label: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      current: currentStats.views,
      previous: previousStats.views,
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
    safety++;
  }

  return result;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key');
    const period = (url.searchParams.get('period') || '7days') as TimePeriod;
    const country = url.searchParams.get('country') || null;
    const sourceId = url.searchParams.get('sourceId') || null;
    const subtagId = url.searchParams.get('subtagId') || null;
    const modelsParam = url.searchParams.get('models') || '';
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    const modelSlugs = modelsParam ? modelsParam.split(',') : [];

    // Verify admin access
    if (!adminKey || adminKey !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { start, end } = getDateRange(period, startDate, endDate);

    // Calculate previous period for fetching data (need 2x range)
    const periodDuration = end.getTime() - start.getTime();
    const fetchStart = new Date(start.getTime() - periodDuration - (24 * 60 * 60 * 1000)); // Add buffer

    // Build base query
    let query = supabaseAdmin
      .from('analytics_events')
      .select('*')
      .gte('created_at', fetchStart.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(10000);

    // Apply filters
    if (country && country !== 'all') {
      query = query.eq('country', country);
    }

    if (sourceId) {
      query = query.eq('source_id', sourceId);
    }

    if (subtagId) {
      query = query.eq('subtag_id', subtagId);
    }

    // Execute events query
    const { data: rawData, error } = await query;
    const rawEvents = (rawData || []).reverse();

    if (error) {
      console.error('Analytics fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch models to join with analytics data
    const { data: modelsData } = await supabaseAdmin
      .from('models')
      .select('id, name, slug, image_url');

    const modelMap = new Map(
      (modelsData || []).map(m => [m.id, { name: m.name, slug: m.slug, image_url: m.image_url }])
    );

    // Map events and flatten model slug using the manual map
    // This replaces the previous SQL join logic
    const events = (rawEvents || []).map(e => {
      // Try to find slug from model_id if not present
      let slug = e.model_slug;
      if (!slug && e.model_id && modelMap.has(e.model_id)) {
        slug = modelMap.get(e.model_id)!.slug;
      }

      return {
        ...e,
        model_slug: slug
      };
    }).filter(e => {
      // Apply in-memory model filter if needed
      if (modelSlugs.length > 0) {
        return e.model_slug && modelSlugs.includes(e.model_slug);
      }
      return true;
    });

    // Fetch Sources
    const { data: sources } = await supabaseAdmin
      .from('traffic_sources')
      .select('*, subtags:tracking_subtags(*)');

    // Process events into dashboard data - REUSING/UPDATING processEvents logic inline or separate?
    // The requirement says "Add this function... and update the response". 
    // It seems to replace the logic.
    // Let's rebuild the response construction based on the prompt's request.


    // 1. Overview
    // Filter events for the CURRENT period for overview/stats
    const currentPeriodEvents = events.filter(e => {
      const d = new Date(e.created_at);
      return d >= start && d <= end;
    });

    const foundTypes = new Set(currentPeriodEvents.map(e => e.event_type));

    // Updated event types to match 020 migration ('page_view', 'link_click')
    const visits = currentPeriodEvents.filter(e => e.event_type === 'page_view').length;
    const clicks = currentPeriodEvents.filter(e => e.event_type === 'link_click').length;
    const uniqueCountries = new Set(currentPeriodEvents.map(e => e.country).filter(Boolean)).size;
    const mainLayoutVisits = currentPeriodEvents.filter(e => e.event_type === 'page_view' && !e.is_tracking_visit).length;
    const trackingLinkVisits = currentPeriodEvents.filter(e => e.event_type === 'page_view' && e.is_tracking_visit).length;

    const overview: OverviewStats & { mainLayoutVisits: number; trackingLinkVisits: number } = {
      totalVisits: visits,
      totalClicks: clicks,
      conversionRate: visits > 0 ? (clicks / visits) * 100 : 0,
      uniqueCountries,
      visitsChange: 0,
      clicksChange: 0,
      mainLayoutVisits,
      trackingLinkVisits,
    };

    // 2. Chart Data (Current vs Previous)
    const chartData = generateComparisonData(events, start, end);

    // 3. Model Comparison Data
    let modelComparisonData: ModelComparisonDataPoint[] | null = null;
    if (modelSlugs.length >= 2) {
      modelComparisonData = generateModelComparisonData(events, modelSlugs, start, end);
    }

    // 4. Source Breakdown
    const sourceMap = new Map<string, { name: string; views: number; clicks: number }>();
    currentPeriodEvents.forEach(e => {
      if (!e.source_id) return;
      const source = sources?.find(s => s.id === e.source_id);
      const name = source ? source.name : 'Unknown';

      if (!sourceMap.has(e.source_id)) {
        sourceMap.set(e.source_id, { name, views: 0, clicks: 0 });
      }
      const stats = sourceMap.get(e.source_id)!;
      if (e.event_type === 'page_view') stats.views++;
      if (e.event_type === 'link_click') stats.clicks++;
    });

    const sourceBreakdown = Array.from(sourceMap.entries()).map(([id, stats]) => ({
      sourceId: id,
      sourceName: stats.name,
      totalViews: stats.views,
      totalClicks: stats.clicks,
      conversionRate: stats.views > 0 ? (stats.clicks / stats.views) * 100 : 0
    })).sort((a, b) => b.totalViews - a.totalViews);

    // 5. Country Breakdown
    const countryMap = new Map<string, { views: number; clicks: number }>();
    currentPeriodEvents.forEach(e => {
      if (!e.country) return;
      if (!countryMap.has(e.country)) countryMap.set(e.country, { views: 0, clicks: 0 });
      const stats = countryMap.get(e.country)!;
      if (e.event_type === 'page_view') stats.views++;
      if (e.event_type === 'link_click') stats.clicks++;
    });

    const countryBreakdown = Array.from(countryMap.entries()).map(([country, stats]) => ({
      country,
      visits: stats.views,
      clicks: stats.clicks
    })).sort((a, b) => b.visits - a.visits);

    // 6. Model Analytics (Individual Cards)
    const modelDataMap = new Map<string, {
      id: string;
      slug: string;
      name: string;
      imageUrl: string | null;
      visits: number;
      clicks: number;
      countries: Map<string, number>;
      dailyData: Map<string, { views: number; clicks: number }>;
    }>();

    currentPeriodEvents.forEach(e => {
      if (!e.model_id) return;
      const modelInfo = modelMap.get(e.model_id);
      if (!modelInfo) return;

      if (!modelDataMap.has(e.model_id)) {
        modelDataMap.set(e.model_id, {
          id: e.model_id,
          slug: modelInfo.slug,
          name: modelInfo.name,
          imageUrl: modelInfo.image_url,
          visits: 0,
          clicks: 0,
          countries: new Map(),
          dailyData: new Map()
        });
      }
      const stats = modelDataMap.get(e.model_id)!;

      if (e.event_type === 'page_view') stats.visits++;
      if (e.event_type === 'link_click') stats.clicks++;

      if (e.country) {
        stats.countries.set(e.country, (stats.countries.get(e.country) || 0) + 1);
      }

      const dateKey = e.created_at.slice(0, 10);
      if (!stats.dailyData.has(dateKey)) stats.dailyData.set(dateKey, { views: 0, clicks: 0 });
      const daily = stats.dailyData.get(dateKey)!;
      if (e.event_type === 'page_view') daily.views++;
      if (e.event_type === 'link_click') daily.clicks++;
    });


    const modelAnalytics = Array.from(modelDataMap.values()).map(m => ({
      modelSlug: m.slug,
      modelName: m.name,
      imageUrl: m.imageUrl,
      visits: m.visits,
      clicks: m.clicks,
      conversionRate: m.visits > 0 ? (m.clicks / m.visits) * 100 : 0,
      topCountries: Array.from(m.countries.entries())
        .map(([c, count]) => ({ country: c, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      dailyData: Array.from(m.dailyData.entries())
        .map(([d, v]) => ({ date: d, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date))
    })).sort((a, b) => b.visits - a.visits);

    // 7. Available Lists
    const { data: allCountriesData } = await supabaseAdmin
      .from('analytics_events')
      .select('country')
      .not('country', 'is', null)
      .limit(10000);

    const availableCountries = [...new Set(allCountriesData?.map((e: any) => e.country).filter(Boolean))].sort() as string[];

    const availableSources: TrafficSourceOption[] = (sources || []).map(source => ({
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

    return NextResponse.json({
      overview,
      chartData,
      modelComparisonData,
      countryBreakdown,
      sourceBreakdown,
      modelAnalytics,
      availableCountries,
      availableSources,
      availableModels,
      debug: {
        now: new Date().toISOString(),
        start: start.toISOString(),
        end: end.toISOString(),
        rawEventCount: rawEvents?.length || 0,
        processedEventCount: events.length,
        currentPeriodCount: currentPeriodEvents.length,
        sampleEvent: currentPeriodEvents[0] || events[0] || null
      }
    });

  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
