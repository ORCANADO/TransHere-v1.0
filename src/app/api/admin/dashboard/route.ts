import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { 
  DashboardData, 
  OverviewStats, 
  ModelAnalytics, 
  ChartDataPoint,
  TimePeriod 
} from '@/types/analytics';

export const runtime = 'edge';

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

// Helper to get date range based on period
function getDateRange(period: TimePeriod, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
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
      start.setFullYear(2020); // Far past date
      break;
    case 'custom':
      if (startDate && endDate) {
        start.setTime(new Date(startDate).getTime());
        end.setTime(new Date(endDate).getTime());
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        // Set start date to beginning of day
        start.setHours(0, 0, 0, 0);
      } else {
        // Fallback to last 7 days if custom dates not provided
        start.setDate(start.getDate() - 7);
      }
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key');
    const period = (url.searchParams.get('period') || '7days') as TimePeriod;
    const country = url.searchParams.get('country') || null;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    
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
    
    // Build base query
    let query = supabaseAdmin
      .from('analytics_events')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });
    
    // Apply country filter if specified
    if (country && country !== 'all') {
      query = query.eq('country', country);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Analytics fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch models to join with analytics data
    const { data: models } = await supabaseAdmin
      .from('models')
      .select('id, name, slug, image_url');

    const modelMap = new Map(
      (models || []).map(m => [m.id, { name: m.name, slug: m.slug, image_url: m.image_url }])
    );

    // Process events into dashboard data
    const dashboardData = processEvents(events || [], period, modelMap);
    
    // Get list of all available countries (unfiltered, for dropdown)
    const { data: allEvents } = await supabaseAdmin
      .from('analytics_events')
      .select('country')
      .not('country', 'is', null);
    
    const availableCountries = [...new Set(
      allEvents?.map(e => e.country).filter(Boolean)
    )] as string[];
    dashboardData.availableCountries = availableCountries.sort();

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

function processEvents(
  events: any[], 
  period: TimePeriod,
  modelMap: Map<string, { name: string; slug: string; image_url: string | null }>
): DashboardData {
  // Calculate overview stats
  const visits = events.filter(e => e.event_type === 'view').length;
  const clicks = events.filter(e => e.event_type === 'click_social' || e.event_type === 'click_content').length;
  const uniqueCountries = new Set(events.map(e => e.country).filter(Boolean)).size;
  
  const overview: OverviewStats = {
    totalVisits: visits,
    totalClicks: clicks,
    conversionRate: visits > 0 ? (clicks / visits) * 100 : 0,
    uniqueCountries,
    visitsChange: 0, // TODO: Calculate from previous period
    clicksChange: 0,
  };

  // Group events by date for chart
  const chartMap = new Map<string, { visits: number; clicks: number }>();
  events.forEach(event => {
    const dateKey = formatDateForGrouping(event.created_at, period);
    const existing = chartMap.get(dateKey) || { visits: 0, clicks: 0 };
    if (event.event_type === 'view') existing.visits++;
    if (event.event_type === 'click_social' || event.event_type === 'click_content') existing.clicks++;
    chartMap.set(dateKey, existing);
  });

  const chartData: ChartDataPoint[] = Array.from(chartMap.entries())
    .map(([date, data]) => ({
      date,
      label: formatDateLabel(date, period),
      visits: data.visits,
      clicks: data.clicks,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group by model
  const modelDataMap = new Map<string, {
    modelId: string;
    modelSlug: string;
    modelName: string;
    imageUrl: string | null;
    visits: number;
    clicks: number;
    countries: Map<string, number>;
    dailyData: Map<string, { visits: number; clicks: number }>;
  }>();

  events.forEach(event => {
    if (!event.model_id) return;
    
    const modelInfo = modelMap.get(event.model_id);
    if (!modelInfo) return; // Skip if model not found
    
    const key = event.model_id;
    const existing = modelDataMap.get(key) || {
      modelId: event.model_id,
      modelSlug: modelInfo.slug,
      modelName: modelInfo.name,
      imageUrl: modelInfo.image_url,
      visits: 0,
      clicks: 0,
      countries: new Map(),
      dailyData: new Map(),
    };

    if (event.event_type === 'view') existing.visits++;
    if (event.event_type === 'click_social' || event.event_type === 'click_content') existing.clicks++;
    
    // Track countries
    if (event.country) {
      existing.countries.set(event.country, (existing.countries.get(event.country) || 0) + 1);
    }
    
    // Track daily data
    const dateKey = event.created_at.slice(0, 10);
    const dayData = existing.dailyData.get(dateKey) || { visits: 0, clicks: 0 };
    if (event.event_type === 'view') dayData.visits++;
    if (event.event_type === 'click_social' || event.event_type === 'click_content') dayData.clicks++;
    existing.dailyData.set(dateKey, dayData);

    modelDataMap.set(key, existing);
  });

  const modelAnalytics: ModelAnalytics[] = Array.from(modelDataMap.values())
    .map(model => ({
      modelId: model.modelId,
      modelSlug: model.modelSlug,
      modelName: model.modelName,
      imageUrl: model.imageUrl,
      visits: model.visits,
      clicks: model.clicks,
      conversionRate: model.visits > 0 ? (model.clicks / model.visits) * 100 : 0,
      topCountries: Array.from(model.countries.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      dailyData: Array.from(model.dailyData.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => b.visits - a.visits);

  // Country breakdown
  const countryMap = new Map<string, { visits: number; clicks: number }>();
  events.forEach(event => {
    if (!event.country) return;
    const existing = countryMap.get(event.country) || { visits: 0, clicks: 0 };
    if (event.event_type === 'view') existing.visits++;
    if (event.event_type === 'click_social' || event.event_type === 'click_content') existing.clicks++;
    countryMap.set(event.country, existing);
  });

  const countryBreakdown = Array.from(countryMap.entries())
    .map(([country, data]) => ({ country, ...data }))
    .sort((a, b) => b.visits - a.visits);

  return {
    overview,
    chartData,
    modelAnalytics,
    countryBreakdown,
    availableCountries: [],
  };
}
