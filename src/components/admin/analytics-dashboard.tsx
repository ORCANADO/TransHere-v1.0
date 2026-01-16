// ============================================
// TRANSHERE v1.1 - ANALYTICS DASHBOARD
// Enhanced with Full Filter System and Comparison Charts
// ============================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, MousePointer, Percent, Globe, RefreshCw, TrendingUp } from 'lucide-react';
import { StatCard } from './stat-card';
import { ComparisonChart } from './comparison-chart';
import { ModelComparisonChart } from './model-comparison-chart';
import { DashboardFiltersBar } from './dashboard-filters';
import { ModelAnalyticsCard } from './model-analytics-card';
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
}

interface DashboardData {
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

export function AnalyticsDashboard({ adminKey }: AnalyticsDashboardProps) {
  // State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [comparisonMetric, setComparisonMetric] = useState<'views' | 'clicks'>('views');

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Find IDs for selected sources/subtags to send to API
      // Note: Current API implementation might need updates to handle multiple sources
      // For now, we'll pass them as a JSON string or individual params if supported
      const params = new URLSearchParams({
        key: adminKey,
        period: filters.period,
        ...(filters.country && { country: filters.country }),
        ...(filters.sources.length > 0 && { sources: JSON.stringify(filters.sources) }),
        ...(filters.modelSlugs.length > 0 && { models: filters.modelSlugs.join(',') }),
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

  // Prepare model comparison data
  const modelChartData = useMemo((): { data: ModelComparisonDataPoint[]; models: ChartModelInfo[] } | null => {
    if (!data?.modelComparisonData || filters.modelSlugs.length < 2) {
      return null;
    }

    const models: ChartModelInfo[] = filters.modelSlugs.map((slug, index) => {
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
  }, [data, filters.modelSlugs]);

  // Determine which chart to show
  const showModelComparison = filters.modelSlugs.length >= 2 && modelChartData;

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
        filters={filters}
        onFiltersChange={setFilters}
        availableCountries={data?.availableCountries || []}
        availableSources={data?.availableSources || []}
        availableModels={data?.availableModels || []}
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
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <StatCard
              title="Countries"
              value={data.overview.uniqueCountries}
              subtitle="Unique visitor locations"
              icon={<Globe className="w-5 h-5 text-foreground" />}
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
              title={`Comparing ${filters.modelSlugs.length} Models`}
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

          {/* Model Analytics */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Model Performance ({data.modelAnalytics.length} models)
            </h3>
            <div className="space-y-3">
              {data.modelAnalytics.map((model) => (
                <ModelAnalyticsCard
                  key={model.modelSlug}
                  model={model}
                  isSelected={filters.modelSlugs.includes(model.modelSlug)}
                  onToggleSelect={() => {
                    setFilters(prev => ({
                      ...prev,
                      modelSlugs: prev.modelSlugs.includes(model.modelSlug)
                        ? prev.modelSlugs.filter(s => s !== model.modelSlug)
                        : [...prev.modelSlugs, model.modelSlug],
                    }));
                  }}
                />
              ))}

              {data.modelAnalytics.length === 0 && (
                <div className="liquid-glass rounded-xl p-8 text-center">
                  <p className="text-muted-foreground">
                    No model-specific data for this period
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
