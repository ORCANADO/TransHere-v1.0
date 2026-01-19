// ============================================
// TRANSHERE v1.1 - ANALYTICS DASHBOARD
// Enhanced with Full Filter System and Comparison Charts
// ============================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Eye, MousePointer, Percent, RefreshCw, TrendingUp } from 'lucide-react';
import { StatCard } from './stat-card';
import { ComparisonChart } from './comparison-chart';
import { ModelComparisonChart } from './model-comparison-chart';
import { DashboardFiltersBar } from './dashboard-filters';
import { ThemeToggle } from './theme-toggle';
import { RefreshButton } from '@/app/admin/components/RefreshButton';
import { cn } from '@/lib/utils';
import type {
  DashboardFilters,
  TimePeriod,
  TrafficSourceOption,
  ModelFilterOption,
  ComparisonDataPoint,
  ModelComparisonDataPoint,
  ChartModelInfo,
} from '@/types/charts';
import { getModelColor } from '@/types/charts';

interface AnalyticsDashboardProps {
  adminKey: string;
  selectedModelIds: string[];
  onModelSelectionChange: (ids: string[]) => void;
  onDataLoaded?: (data: DashboardData) => void;
  isSidebarCollapsed?: boolean;
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
  modelComparisonData: ModelComparisonDataPoint[] | null;
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
  selectedModelIds,
  onModelSelectionChange,
  onDataLoaded,
  isSidebarCollapsed = false,
}: AnalyticsDashboardProps) {
  // State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Internal filters (excluding models which come from props)
  const [filters, setFilters] = useState<Omit<DashboardFilters, 'modelSlugs'>>({
    period: DEFAULT_FILTERS.period,
    startDate: DEFAULT_FILTERS.startDate,
    endDate: DEFAULT_FILTERS.endDate,
    country: DEFAULT_FILTERS.country,
    sources: DEFAULT_FILTERS.sources,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [comparisonMetric, setComparisonMetric] = useState<'views' | 'clicks'>('views');
  const [queryTime, setQueryTime] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  // Keep a ref of available models mapping to avoid infinite loops in fetchData
  const availableModelsRef = useRef<ModelFilterOption[]>([]);
  useEffect(() => {
    if (data?.availableModels) {
      availableModelsRef.current = data.availableModels;
    }
  }, [data?.availableModels]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Derive model slugs from IDs using ref to avoid reactive dependency loop
      const modelSlugs = selectedModelIds.map(id => {
        const model = availableModelsRef.current.find(m => m.slug === id || m.id === id);
        return model?.slug || id;
      });

      const params = new URLSearchParams({
        key: adminKey,
        period: filters.period,
        ...(filters.country && { country: filters.country }),
        ...(filters.sources.length > 0 && { sources: JSON.stringify(filters.sources) }),
        ...(selectedModelIds.length > 0 && { models: modelSlugs.join(',') }),
        ...(filters.period === 'custom' && filters.startDate && { startDate: filters.startDate }),
        ...(filters.period === 'custom' && filters.endDate && { endDate: filters.endDate }),
      });

      const res = await fetch(`/api/admin/dashboard?${params}`);
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
        })),
        modelComparisonData: dashboardData.modelComparison || null,
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
  }, [adminKey, filters, selectedModelIds, onDataLoaded]);

  // Fetch on mount and filter changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Determine model slugs for charts and filters
  const currentModelSlugs = useMemo(() => {
    if (!data?.availableModels) return [];
    return selectedModelIds.map(id => {
      const model = data.availableModels.find(m => (m as any).id === id || m.slug === id);
      return model?.slug || id;
    });
  }, [selectedModelIds, data?.availableModels]);

  // Prepare model comparison data
  const modelChartData = useMemo((): { data: ModelComparisonDataPoint[]; models: ChartModelInfo[] } | null => {
    if (!data?.modelComparisonData || currentModelSlugs.length < 2) {
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
      data: data.modelComparisonData,
      models,
    };
  }, [data, currentModelSlugs]);

  // Determine which chart to show
  const showModelComparison = currentModelSlugs.length >= 2 && modelChartData;

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

  return (
    <div className="space-y-6">
      {/* Sticky Filters Bar & Header Info */}
      <div className={cn(
        "sticky top-0 z-30 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-white/10 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300",
        isSidebarCollapsed && "pl-16 lg:pl-20"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <DashboardFiltersBar
            filters={{ ...filters, modelSlugs: currentModelSlugs }}
            onFiltersChange={(newFilters) => {
              const { modelSlugs: _, ...otherFilters } = newFilters;
              setFilters(otherFilters);
            }}
            availableCountries={data?.availableCountries || []}
            availableSources={data?.availableSources || []}
            isLoading={loading}
          />

          {lastUpdated && !loading && (
            <p className="text-[#86868B] dark:text-gray-400 text-xs font-medium">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Query Performance Badge */}
          {queryTime !== null && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-transparent dark:border-white/10 text-[10px] text-black/40 dark:text-white/40 font-mono uppercase tracking-wider">
              <span>Query: {queryTime}ms</span>
            </div>
          )}

          <RefreshButton
            adminKey={adminKey}
            onRefreshComplete={() => {
              fetchData();
            }}
          />

          <div className="h-8 w-[1px] bg-[#E5E5EA] dark:bg-white/10 hidden md:block mx-1" />

          <ThemeToggle showLabels className="hidden md:flex" />
          <ThemeToggle className="md:hidden" />
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="liquid-glass rounded-xl p-6 animate-pulse">
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
                {new Date(lastRefresh).toLocaleString()}
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
          {data.chartData.length === 0 && data.overview.totalVisits === 0 ? (
            <div className="bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-black/[0.04] dark:bg-white/5 flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-[#86868B] dark:text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-semibold text-[#1D1D1F] dark:text-white">No data found</h3>
              <p className="text-[#86868B] dark:text-muted-foreground mt-2 max-w-sm">
                No activity recorded for the selected period or filters. Try adjusting your filters or date range.
              </p>
              <button
                onClick={() => fetchData()}
                className="mt-6 px-6 py-2.5 bg-[#007AFF] text-white rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-[#007AFF]/20"
              >
                Refresh Data
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Total Page Views"
                  value={data.overview.totalVisits}
                  icon={<Eye className="w-5 h-5 text-[#007AFF]" />}
                  change={data.overview.visitsChange}
                  valueClassName="text-[#007AFF] dark:text-[#007AFF]"
                  subtitle={`${data.overview.mainLayoutVisits.toLocaleString()} organic • ${data.overview.trackingLinkVisits.toLocaleString()} from links`}
                />
                <StatCard
                  title="Total Clicks"
                  value={data.overview.totalClicks}
                  subtitle="OnlyFans/Fansly redirects"
                  icon={<MousePointer className="w-5 h-5 text-[#AF52DE]" />}
                  valueClassName="text-[#AF52DE] dark:text-[#AF52DE]"
                  change={data.overview.clicksChange}
                />
                <StatCard
                  title="Conversion Rate"
                  value={`${data.overview.conversionRate.toFixed(2)}%`}
                  subtitle={<span className="flex items-center gap-1.5"><span className="text-[#AF52DE]">Clicks</span> / <span className="text-[#007AFF]">Views</span></span>}
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
                  onMetricChange={setComparisonMetric}
                  title={`Comparing ${currentModelSlugs.length} Models`}
                  height={350}
                  className="bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-2xl p-4 lg:p-6 shadow-sm"
                />
              ) : (
                /* Standard Comparison Chart - Current vs Previous */
                <ComparisonChart
                  data={data.chartData}
                  title="Traffic Over Time (Current vs Previous Period)"
                  height={300}
                  className="bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-2xl p-4 lg:p-6 shadow-sm"
                />
              )}

              {/* Source Breakdown */}
              {data.sourceBreakdown && data.sourceBreakdown.length > 0 && (
                <div className="bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-2xl p-4 lg:p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#007AFF]" />
                    <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">Traffic Sources</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {data.sourceBreakdown.map((source) => (
                      <button
                        key={source.sourceId}
                        onClick={() => setFilters(prev => {
                          const isSelected = prev.sources.some(s => s.source === source.sourceName);
                          return {
                            ...prev,
                            sources: isSelected
                              ? prev.sources.filter(s => s.source !== source.sourceName)
                              : [...prev.sources, { source: source.sourceName, subtags: [] }]
                          };
                        })}
                        className={cn(
                          "p-4 rounded-xl text-left transition-all border",
                          filters.sources.some(s => s.source === source.sourceName)
                            ? 'bg-[#007AFF]/10 dark:bg-[#AF52DE]/20 border-[#007AFF]/30 dark:border-[#AF52DE]/40 ring-1 ring-[#007AFF]/20'
                            : 'bg-black/[0.03] dark:bg-white/5 border-transparent hover:bg-black/[0.06] dark:hover:bg-white/10'
                        )}
                      >
                        <p className="font-semibold text-[#1D1D1F] dark:text-white">{source.sourceName}</p>
                        <div className="flex justify-between mt-1 text-sm">
                          <span className="text-[#007AFF] font-medium">{source.totalViews.toLocaleString()} views</span>
                          <span className="text-[#AF52DE] font-medium">{source.totalClicks.toLocaleString()} clicks</span>
                        </div>
                        <p className="text-xs text-[#86868B] dark:text-muted-foreground mt-1 font-medium">
                          {source.conversionRate.toFixed(1)}% CTR
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Country Breakdown */}
              {data.countryBreakdown.length > 0 && (
                <div className="bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-2xl p-4 lg:p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-white mb-4">Top Countries</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {data.countryBreakdown.slice(0, 10).map(({ country, visits, clicks }) => (
                      <button
                        key={country}
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          country: prev.country === country ? null : country,
                        }))}
                        className={cn(
                          "p-4 rounded-xl text-left transition-all border",
                          filters.country === country
                            ? 'bg-[#007AFF]/10 dark:bg-[#007AFF]/20 border-[#007AFF]/30 dark:border-[#007AFF]/40 ring-1 ring-[#007AFF]/20'
                            : 'bg-black/[0.03] dark:bg-white/5 border-transparent hover:bg-black/[0.06] dark:hover:bg-white/10'
                        )}
                      >
                        <p className="font-semibold text-[#1D1D1F] dark:text-white">{country}</p>
                        <div className="flex justify-between mt-1 text-sm">
                          <span className="text-[#007AFF] font-medium">{visits} views</span>
                          <span className="text-[#AF52DE] font-medium">{clicks} clicks</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
