// ============================================
// TRANSHERE v1.1 - ANALYTICS DASHBOARD
// Enhanced with Full Filter System and Comparison Charts
// ============================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, MousePointer, Percent, RefreshCw, TrendingUp } from 'lucide-react';
import { StatCard } from './stat-card';
import { ComparisonChart } from './comparison-chart';
import { ModelComparisonChart } from './model-comparison-chart';
import { DashboardFiltersBar } from './dashboard-filters';
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
  onModelSelectionChange
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

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Derive model slugs from IDs using available data if we have it
      const modelSlugs = selectedModelIds.map(id => {
        const model = data?.availableModels.find(m => m.slug === id || (m as any).id === id);
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
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch analytics');
      }

      setData(json);
      console.log('📊 Dashboard Data Received - Countries:', json.availableCountries?.length);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [adminKey, filters]);

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
          className="px-4 py-2 bg-[#7A27FF] text-white rounded-lg hover:bg-[#7A27FF]/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          {lastUpdated && (
            <p className="text-muted-foreground text-sm">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start lg:self-auto p-2 liquid-glass-button rounded-lg text-foreground hover:bg-white/10 transition-colors disabled:opacity-50"
          aria-label="Refresh data"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters Bar */}
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
          {/* Refresh Overlay Spinner */}
          {loading && (
            <div className="absolute inset-x-0 -top-4 bottom-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-[2px] transition-all duration-300 rounded-xl overflow-hidden">
              <div className="bg-card/80 border border-white/10 p-4 rounded-full shadow-2xl scale-up-subtle">
                <RefreshCw className="w-8 h-8 text-[#7A27FF] animate-spin" />
              </div>
            </div>
          )}

          {/* Empty State: No data for filters */}
          {data.chartData.length === 0 && data.overview.totalVisits === 0 ? (
            <div className="liquid-glass rounded-xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-semibold text-white">No data found</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                No activity recorded for the selected period or filters. Try adjusting your filters or date range.
              </p>
              <button
                onClick={() => fetchData()}
                className="mt-6 px-4 py-2 bg-[#7A27FF] text-white rounded-lg hover:bg-[#7A27FF]/80 transition-colors"
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
                  icon={<Eye className="w-5 h-5 text-[#7A27FF]" />}
                  change={data.overview.visitsChange}
                  subtitle={`${data.overview.mainLayoutVisits.toLocaleString()} organic • ${data.overview.trackingLinkVisits.toLocaleString()} from links`}
                />
                <StatCard
                  title="Total Clicks"
                  value={data.overview.totalClicks}
                  subtitle="OnlyFans/Fansly redirects"
                  icon={<MousePointer className="w-5 h-5 text-[#00FF85]" />}
                  change={data.overview.clicksChange}
                />
                <StatCard
                  title="Conversion Rate"
                  value={`${data.overview.conversionRate.toFixed(2)}%`}
                  subtitle="Clicks / Views"
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
                />
              ) : (
                /* Standard Comparison Chart - Current vs Previous */
                <ComparisonChart
                  data={data.chartData}
                  title="Traffic Over Time (Current vs Previous Period)"
                  height={300}
                />
              )}

              {/* Source Breakdown */}
              {data.sourceBreakdown && data.sourceBreakdown.length > 0 && (
                <div className="liquid-glass rounded-xl p-4 lg:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[#7A27FF]" />
                    <h3 className="text-lg font-semibold text-foreground">Traffic Sources</h3>
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
                        className={`p-3 rounded-lg text-left transition-all ${filters.sources.some(s => s.source === source.sourceName)
                          ? 'bg-[#7A27FF]/20 ring-2 ring-[#7A27FF]'
                          : 'bg-white/5 hover:bg-white/10'
                          }`}
                      >
                        <p className="font-medium text-foreground">{source.sourceName}</p>
                        <div className="flex justify-between mt-1 text-sm">
                          <span className="text-[#7A27FF]">{source.totalViews.toLocaleString()} views</span>
                          <span className="text-[#00FF85]">{source.totalClicks.toLocaleString()} clicks</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {source.conversionRate.toFixed(1)}% CTR
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Country Breakdown */}
              {data.countryBreakdown.length > 0 && (
                <div className="liquid-glass rounded-xl p-4 lg:p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Top Countries</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {data.countryBreakdown.slice(0, 10).map(({ country, visits, clicks }) => (
                      <button
                        key={country}
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          country: prev.country === country ? null : country,
                        }))}
                        className={`p-3 rounded-lg text-left transition-all ${filters.country === country
                          ? 'bg-[#00FF85]/20 ring-2 ring-[#00FF85]'
                          : 'bg-white/5 hover:bg-white/10'
                          }`}
                      >
                        <p className="font-medium text-foreground">{country}</p>
                        <div className="flex justify-between mt-1 text-sm">
                          <span className="text-[#7A27FF]">{visits} views</span>
                          <span className="text-[#00FF85]">{clicks} clicks</span>
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
