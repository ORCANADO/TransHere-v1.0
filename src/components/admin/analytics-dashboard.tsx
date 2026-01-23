// ============================================
// TRANSHERE v1.1 - ANALYTICS DASHBOARD
// Enhanced with Full Filter System and Comparison Charts
// ============================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Eye, MousePointer, Percent, RefreshCw, TrendingUp, Users, Instagram, Twitter, Heart, Cloud, Link2, BarChart3 } from 'lucide-react';
import { StatCard } from './stat-card';
import { ComparisonChart } from './comparison-chart';
import { ModelComparisonChart } from './model-comparison-chart';
import { DashboardContainer } from './dashboard-container';
import { DashboardFiltersBar as OrgFiltersBar } from './dashboard-filters';
import { DashboardFiltersBar as AdminFiltersBar } from './dashboard-filters-bar';
import { SidebarModelList } from './SidebarModelList';

// Import the default sources from the filters component
const DEFAULT_SOURCES = [
  { name: 'direct', icon: Users },
  { name: 'instagram', icon: Instagram },
  { name: 'twitter', icon: Twitter },
  { name: 'onlyfans', icon: Heart },
  { name: 'fansly', icon: Cloud },
];
import { ThemeToggle } from './theme-toggle';
import { RefreshButton } from '@/app/admin/components/RefreshButton';
import { cn } from '@/lib/utils';
import type {
  DashboardFilters,
  TrafficSourceOption,
  ModelFilterOption,
  ComparisonDataPoint,
  ModelComparisonDataPoint,
  ChartModelInfo,
} from '@/types/charts';
import type { SidebarModel } from '@/types/analytics';
import { getModelColor } from '@/types/charts';

interface AnalyticsDashboardProps {
  adminKey: string;
  onDataLoaded?: (data: DashboardData) => void;
  endpoint?: string;
  mode?: 'admin' | 'org';
  header?: React.ReactNode;
  embedded?: boolean;
  selectedModelSlugs?: string[];  // External model selection from parent
}

interface DashboardData {
  // ... (keep rest unchanged)
  overview: {
    totalVisits: number;
    totalClicks: number;
    conversionRate: number;
    uniqueCountries: number;
    visitsChange?: number;
    clicksChange?: number;
    mainLayoutVisits: number;
    trackingLinkVisits: number;
  };
  chartData: ComparisonDataPoint[];
  modelComparisonViews: ModelComparisonDataPoint[] | null;
  modelComparisonClicks: ModelComparisonDataPoint[] | null;
  countryBreakdown: { country: string; visits: number; clicks: number }[];
  sourceBreakdown: {
    sourceId: string;
    sourceName: string;
    totalViews: number;
    totalClicks: number;
    conversionRate: number;
  }[];
  modelAnalytics: {
    modelSlug: string;
    modelName: string;
    imageUrl: string | null;
    visits: number;
    clicks: number;
    conversionRate: number;
    topCountries: { country: string; count: number }[];
    dailyData: { date: string; views: number; clicks: number }[];
  }[];
  availableCountries: string[];
  availableSources: TrafficSourceOption[];
  availableModels: ModelFilterOption[];
  allModelMetrics?: any[];
  sidebarMetrics?: { modelSlug: string; views: number; clicks: number }[];  // ADD THIS
}

/**
 * Default filter state
 */
const DEFAULT_FILTERS: DashboardFilters = {
  period: '7days',
  startDate: null,
  endDate: null,
  country: null,
  sources: [],
  modelSlugs: [],
};

export function AnalyticsDashboard({
  adminKey,
  onDataLoaded,
  endpoint,
  mode = 'admin',
  header,
  embedded = false,
  selectedModelSlugs: externalModelSlugs,
}: AnalyticsDashboardProps) {
  // State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unified filter state
  const [filters, setFilters] = useState<DashboardFilters>({
    period: '7days',
    modelSlugs: externalModelSlugs || [],
    country: null,
    countries: [],
    sources: [],
    startDate: null,
    endDate: null,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [comparisonMetric, setComparisonMetric] = useState<'views' | 'clicks'>('views');
  const [queryTime, setQueryTime] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);



  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        key: adminKey,
        period: filters.period,
        ...(filters.modelSlugs.length && { modelSlugs: JSON.stringify(filters.modelSlugs) }),
        ...(mode === 'org' && filters.country && { countries: filters.country }),
        ...(mode === 'admin' && filters.countries && filters.countries.length && { countries: JSON.stringify(filters.countries) }),
        ...(filters.sources.length && { sources: JSON.stringify(filters.sources) }),
        ...(filters.period === 'custom' && filters.startDate && { startDate: filters.startDate }),
        ...(filters.period === 'custom' && filters.endDate && { endDate: filters.endDate }),
      });

      const res = await fetch(`${endpoint || '/api/admin/dashboard'}?${params}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      // Legacy support: map new stats structure to old overview structure if needed
      const dashboardData = result.data;

      // Adapt the response to the component's internal DashboardData interface
      const adaptedData: DashboardData = {
        overview: {
          totalVisits: dashboardData.stats.totalViews,
          totalClicks: dashboardData.stats.totalClicks,
          conversionRate: dashboardData.stats.ctr,
          uniqueCountries: dashboardData.stats.uniqueCountries,
          mainLayoutVisits: dashboardData.stats.mainLayoutVisits || 0,
          trackingLinkVisits: dashboardData.stats.trackingLinkVisits || 0,
        },
        chartData: dashboardData.chartData.map((d: any) => ({
          date: d.date,
          label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          current: d.views,
          previous: d.visitsPrev || 0,
          clicks: d.clicks || 0,
          clicksPrev: d.clicksPrev || 0,
        })),
        modelComparisonViews: dashboardData.modelComparisonViews || null,
        modelComparisonClicks: dashboardData.modelComparisonClicks || null,
        sourceBreakdown: dashboardData.stats.topSources.map((s: any) => ({
          sourceId: s.source_name,
          sourceName: s.source_name,
          totalViews: s.total_views,
          totalClicks: s.total_clicks,
          conversionRate: (s.total_clicks / Math.max(s.total_views, 1)) * 100,
        })),
        countryBreakdown: dashboardData.stats.topCountries.map((c: any) => ({
          country: c.country,
          visits: c.total_views,
          clicks: c.total_clicks,
        })),
        modelAnalytics: dashboardData.stats.topModels.map((m: any) => ({
          modelSlug: m.model_slug,
          modelName: m.model_slug,
          imageUrl: null,
          visits: m.total_views,
          clicks: m.total_clicks,
          conversionRate: m.ctr_percentage,
          topCountries: [],
          dailyData: [],
        })),
        availableCountries: dashboardData.availableCountries || [],
        availableSources: dashboardData.availableSources || [],
        availableModels: dashboardData.availableModels || [],
        allModelMetrics: dashboardData.stats.modelMetrics || [],
        // ADD THIS: Dedicated field for ALL model metrics (unfiltered)
        sidebarMetrics: (dashboardData.allModelMetrics || dashboardData.stats.modelMetrics || []).map((m: any) => ({
          modelSlug: m.model_slug,
          views: m.total_views,
          clicks: m.total_clicks,
        })),
      };

      setData(adaptedData);
      setQueryTime(result.data.queryTime);
      setLastRefresh(result.data.lastRefresh?.timestamp || null);

      if (onDataLoaded) onDataLoaded(adaptedData);
      if (result.warning) console.warn('Dashboard warning:', result.warning);

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [adminKey, filters, onDataLoaded, endpoint]);

  // Sync external model selection with internal filters
  useEffect(() => {
    if (externalModelSlugs !== undefined) {
      setFilters(f => ({
        ...f,
        modelSlugs: externalModelSlugs,
      }));
    }
  }, [externalModelSlugs]);

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Model slugs for charts and filters - use external selection if provided
  const currentModelSlugs = externalModelSlugs ?? filters.modelSlugs;

  // Map sidebar models by linking available model metadata with analytics metrics
  const sidebarModels = useMemo(() => {
    if (!data?.availableModels) return [];

    // Sort models: those with current metrics first, then alphabetically
    return [...data.availableModels].sort((a, b) => {
      const aMetric = data.sidebarMetrics?.find(m => m.modelSlug === a.slug);
      const bMetric = data.sidebarMetrics?.find(m => m.modelSlug === b.slug);

      if (aMetric && !bMetric) return -1;
      if (!aMetric && bMetric) return 1;
      if (aMetric && bMetric) return (bMetric.views - aMetric.views);
      return a.name.localeCompare(b.name);
    });
  }, [data?.availableModels, data?.sidebarMetrics]);

  // Create a metrics map for the sidebar's specific metrics prop
  const metricsMap = useMemo(() => {
    const map: Record<string, { views: number; clicks: number }> = {};
    data?.sidebarMetrics?.forEach(m => {
      map[m.modelSlug] = { views: m.views, clicks: m.clicks };
    });
    return map;
  }, [data?.sidebarMetrics]);

  // Prepare model comparison data
  const modelChartData = useMemo((): { data: ModelComparisonDataPoint[]; models: ChartModelInfo[] } | null => {
    const comparisonData = comparisonMetric === 'views'
      ? data?.modelComparisonViews
      : data?.modelComparisonClicks;

    if (!comparisonData || currentModelSlugs.length < 2 || !data) {
      return null;
    }

    const models: ChartModelInfo[] = currentModelSlugs.map((slug, index) => {
      const modelInfo = data.availableModels.find(m => m.slug === slug);
      return {
        slug,
        name: modelInfo?.name || slug,
        color: getModelColor(index),
      };
    });

    return {
      data: comparisonData as ModelComparisonDataPoint[],
      models,
    };
  }, [data, currentModelSlugs, comparisonMetric]);

  // Prepare comparison chart data based on selected metric
  const derivedChartData = useMemo(() => {
    if (!data?.chartData) return [];
    return data.chartData.map(point => ({
      ...point,
      current: comparisonMetric === 'views' ? point.current : (point.clicks || 0),
      previous: comparisonMetric === 'views' ? point.previous : (point.clicksPrev || 0),
    }));
  }, [data?.chartData, comparisonMetric]);

  // Determine which chart to show
  const showModelComparison = currentModelSlugs.length >= 2 && modelChartData;

  // Map available sources to TrafficSourceOption format
  const availableSourcesMapped = useMemo(() =>
    data?.availableSources?.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug || s.id,
      icon: 'Link2', // Default icon name for sources, will be matched case-insensitively in component
      subtags: s.subtags || [],
    })) || [],
    [data?.availableSources]);

  // Error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">Error: {error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#007AFF]/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="space-y-6">
        {/* Filters Bar */}
        {mode === 'org' ? (
          <OrgFiltersBar
            filters={filters}
            onFiltersChange={(newFilters) => setFilters(newFilters)}
            availableCountries={data?.availableCountries || []}
            availableSources={availableSourcesMapped}
            isLoading={loading}
          />
        ) : (
          <AdminFiltersBar
            filters={filters}
            onFiltersChange={(partial) => setFilters(f => ({ ...f, ...partial }))}
            availableCountries={data?.availableCountries || []}
            availableSources={data?.availableSources?.map(s => ({
              name: s.name,
              icon: 'Link2'
            })) || []}
            loading={loading}
          />
        )}

        {/* Dashboard content */}
        {loading && !data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-20 mb-2" />
                <div className="h-8 bg-white/10 rounded w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Dashboard content */}
        {data && (
          <div className="relative">
            {/* Data Freshness Indicator */}
            {lastRefresh && (
              <div className="mb-4 flex items-center gap-2 text-sm text-black/40 dark:text-white/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF85] animate-pulse" />
                <span>Data as of:</span>
                <span className="font-medium text-black/60 dark:text-white/60">
                  {new Date(lastRefresh!).toLocaleString()}
                </span>
              </div>
            )}
            {/* Refresh Overlay Spinner */}
            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-[2px] transition-all duration-300 rounded-2xl overflow-hidden">
                <div className="bg-white/90 dark:bg-[#0A1221]/90 border border-[#E5E5EA] dark:border-white/10 p-5 rounded-3xl shadow-2xl scale-up-subtle">
                  <RefreshCw className="w-8 h-8 text-[#007AFF] animate-spin" />
                </div>
              </div>
            )}

            {/* Empty State: No data for filters */}
            {data.overview.totalVisits === 0 && (
              <div className="col-span-full p-8 text-center bg-card border border-white/10 rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#7A27FF]/10 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-[#7A27FF]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Analytics Data</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  No events found for the selected filters. Try expanding the date range or clearing filters.
                </p>
              </div>
            )}

            {/* Show content when data exists and has values */}
            {data.overview.totalVisits > 0 && (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard
                    title="Total Page Views"
                    value={data.overview.totalVisits}
                    icon={<Eye className="w-5 h-5 text-[#00FF85]" />}
                    change={data.overview.visitsChange}
                    valueClassName="text-[#00FF85] dark:text-[#00FF85]"
                    subtitle={`${data.overview.mainLayoutVisits.toLocaleString()} organic • ${data.overview.trackingLinkVisits.toLocaleString()} from links`}
                  />
                  <StatCard
                    title="Total Clicks"
                    value={data.overview.totalClicks}
                    subtitle="OnlyFans/Fansly redirects"
                    icon={<MousePointer className="w-5 h-5 text-[#7A27FF]" />}
                    valueClassName="text-[#7A27FF] dark:text-[#7A27FF]"
                    change={data.overview.clicksChange}
                  />
                  <StatCard
                    title="Conversion Rate"
                    value={`${data.overview.conversionRate.toFixed(2)}%`}
                    subtitle={<span className="flex items-center gap-1.5"><span className="text-[#7A27FF]">Clicks</span> / <span className="text-[#00FF85]">Views</span></span>}
                    icon={<Percent className="w-5 h-5 text-[#D4AF37]" />}
                  />
                </div>

                {/* Chart Section */}
                {showModelComparison ? (
                  /* Model Comparison Chart - When 2+ models selected */
                  <ModelComparisonChart
                    data={modelChartData!.data}
                    models={modelChartData!.models}
                    metric={comparisonMetric}
                    onMetricChange={mode === 'org' ? undefined : setComparisonMetric}
                    title={`Comparing ${currentModelSlugs.length} Models`}
                    height={350}
                    className="glass-panel rounded-2xl p-4 lg:p-6 border border-white/10"
                  />
                ) : (
                  /* Standard Comparison Chart - Current vs Previous */
                  <ComparisonChart
                    data={derivedChartData}
                    metric={comparisonMetric}
                    onMetricChange={mode === 'org' ? undefined : setComparisonMetric}
                    title={`Traffic Over Time (${comparisonMetric === 'views' ? 'Page Views' : 'Clicks'})`}
                    height={300}
                    className="glass-panel rounded-2xl p-4 lg:p-6 border border-white/10"
                  />
                )}


              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <DashboardContainer
      header={header}
      sidebar={
        // Only render internal sidebar if no external model selection
        externalModelSlugs === undefined ? (
          <SidebarModelList
            models={sidebarModels as any}
            metrics={metricsMap}
            selectedIds={filters.modelSlugs}
            onModelToggle={(slug) => {
              const newSlugs = filters.modelSlugs.includes(slug)
                ? filters.modelSlugs.filter(s => s !== slug)
                : [...filters.modelSlugs, slug];
              setFilters(f => ({ ...f, modelSlugs: newSlugs }));
            }}
            onClearSelection={() => setFilters(f => ({ ...f, modelSlugs: [] }))}
            onEditModel={() => { }}
            onManageTrackingLinks={() => { }}
            isLoading={loading && !data}
          />
        ) : null
      }
      filters={
        mode === 'org' ? (
          <OrgFiltersBar
            filters={filters}
            onFiltersChange={(newFilters) => setFilters(newFilters)}
            availableCountries={data?.availableCountries || []}
            availableSources={availableSourcesMapped}
            isLoading={loading}
          />
        ) : (
          <AdminFiltersBar
            filters={filters}
            onFiltersChange={(partial) => setFilters(f => ({ ...f, ...partial }))}
            availableCountries={data?.availableCountries || []}
            availableSources={data?.availableSources?.map(s => ({
              name: s.name,
              icon: 'Link2'
            })) || []}
            loading={loading}
          />
        )
      }
    >
      {/* Dashboard content */}
      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-white/10 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-20 mb-2" />
              <div className="h-8 bg-white/10 rounded w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Dashboard content */}
      {data && (
        <div className="relative">
          {/* Data Freshness Indicator */}
          {lastRefresh && (
            <div className="mb-4 flex items-center gap-2 text-sm text-black/40 dark:text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF85] animate-pulse" />
              <span>Data as of:</span>
              <span className="font-medium text-black/60 dark:text-white/60">
                {new Date(lastRefresh!).toLocaleString()}
              </span>
            </div>
          )}
          {/* Refresh Overlay Spinner */}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-[2px] transition-all duration-300 rounded-2xl overflow-hidden">
              <div className="bg-white/90 dark:bg-[#0A1221]/90 border border-[#E5E5EA] dark:border-white/10 p-5 rounded-3xl shadow-2xl scale-up-subtle">
                <RefreshCw className="w-8 h-8 text-[#007AFF] animate-spin" />
              </div>
            </div>
          )}

          {/* Empty State: No data for filters */}
          {data.overview.totalVisits === 0 && (
            <div className="col-span-full p-8 text-center bg-card border border-white/10 rounded-xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#7A27FF]/10 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-[#7A27FF]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                No events found for the selected filters. Try expanding the date range or clearing filters.
              </p>
            </div>
          )}

          {/* Show content when data exists and has values */}
          {data.overview.totalVisits > 0 && (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Total Page Views"
                  value={data.overview.totalVisits}
                  icon={<Eye className="w-5 h-5 text-[#00FF85]" />}
                  change={data.overview.visitsChange}
                  valueClassName="text-[#00FF85] dark:text-[#00FF85]"
                  subtitle={`${data.overview.mainLayoutVisits.toLocaleString()} organic • ${data.overview.trackingLinkVisits.toLocaleString()} from links`}
                />
                <StatCard
                  title="Total Clicks"
                  value={data.overview.totalClicks}
                  subtitle="OnlyFans/Fansly redirects"
                  icon={<MousePointer className="w-5 h-5 text-[#7A27FF]" />}
                  valueClassName="text-[#7A27FF] dark:text-[#7A27FF]"
                  change={data.overview.clicksChange}
                />
                <StatCard
                  title="Conversion Rate"
                  value={`${data.overview.conversionRate.toFixed(2)}%`}
                  subtitle={<span className="flex items-center gap-1.5"><span className="text-[#7A27FF]">Clicks</span> / <span className="text-[#00FF85]">Views</span></span>}
                  icon={<Percent className="w-5 h-5 text-[#D4AF37]" />}
                />
              </div>

              {/* Chart Section */}
              {showModelComparison ? (
                /* Model Comparison Chart - When 2+ models selected */
                <ModelComparisonChart
                  data={modelChartData!.data}
                  models={modelChartData!.models}
                  metric={comparisonMetric}
                  onMetricChange={mode === 'org' ? undefined : setComparisonMetric}
                  title={`Comparing ${currentModelSlugs.length} Models`}
                  height={350}
                  className="glass-panel rounded-2xl p-4 lg:p-6 border border-white/10"
                />
              ) : (
                /* Standard Comparison Chart - Current vs Previous */
                <ComparisonChart
                  data={derivedChartData}
                  metric={comparisonMetric}
                  onMetricChange={mode === 'org' ? undefined : setComparisonMetric}
                  title={`Traffic Over Time (${comparisonMetric === 'views' ? 'Page Views' : 'Clicks'})`}
                  height={300}
                  className="glass-panel rounded-2xl p-4 lg:p-6 border border-white/10"
                />
              )}


            </div>
          )}
        </div>
      )}
    </DashboardContainer>
  );
}
