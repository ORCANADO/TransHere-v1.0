'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Eye, MousePointer, Percent, Users, TrendingUp, RefreshCw, BarChart3, Shield } from 'lucide-react';
import { OrganizationModelCard } from './organization-model-card';
import { ModelDetailPanel } from './model-detail-panel';
import { StatCard } from '@/components/admin/stat-card';
import { ComparisonChart } from '@/components/admin/comparison-chart';
import { ModelComparisonChart } from '@/components/admin/model-comparison-chart';
import { DashboardContainer } from '@/components/admin/dashboard-container';
import { DashboardFiltersBar } from '@/components/admin/dashboard-filters';
import { SidebarModelList } from '@/components/admin/sidebar-model-list';
import { ThemeToggle } from '@/components/admin/theme-toggle';
import { TrackingLinkManager } from '@/app/admin/components/TrackingLinkManager';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { cn } from '@/lib/utils';
import type { Organization } from '@/types/organization';
import type { Model } from '@/types';
import type {
    DashboardFilters,
    TimePeriod,
    ComparisonDataPoint,
    ModelComparisonDataPoint,
    ChartModelInfo
} from '@/types/charts';
import type { DashboardResponse, DashboardStats } from '@/types/analytics-aggregated';
import { getModelColor } from '@/types/charts';

interface OrganizationDashboardProps {
    organization: Organization;
    models: Model[];
    analytics: {
        totalViews: number;
        totalClicks: number;
        ctr: number;
        topModels: Array<{
            modelId: string;
            modelName: string;
            views: number;
            clicks: number;
        }>;
        countryBreakdown: Array<{
            country: string;
            views: number;
            clicks: number;
        }>;
    };
    apiKey: string;
    startDate: string;
    endDate: string;
}

const DEFAULT_FILTERS: DashboardFilters = {
    period: '7days',
    startDate: undefined,
    endDate: undefined,
    country: null,
    countries: [],
    sources: [],
    modelSlugs: [],
};

export function OrganizationDashboard({
    organization,
    models: initialModels,
    analytics: initialAnalytics,
    apiKey,
    startDate: initialStartDate,
    endDate: initialEndDate,
}: OrganizationDashboardProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Theme logic
    useAdminTheme();

    // State
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [comparisonMetric, setComparisonMetric] = useState<'views' | 'clicks'>('views');
    const [isTrackingManagerOpen, setIsTrackingManagerOpen] = useState(false);
    const [trackingModel, setTrackingModel] = useState<{ id: string; name: string; slug: string } | null>(null);

    const [filters, setFilters] = useState<DashboardFilters>({
        ...DEFAULT_FILTERS,
        period: (searchParams.get('period') as TimePeriod) || '7days',
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        countries: searchParams.get('countries') ? JSON.parse(searchParams.get('countries')!) : [],
        sources: searchParams.get('sources') ? JSON.parse(searchParams.get('sources')!) : [],
    });

    // State for detail panel
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Helper function to handle partial filter updates
    const handleFiltersChange = useCallback((partialFilters: Partial<DashboardFilters>) => {
        setFilters(current => ({ ...current, ...partialFilters }));
    }, []);

    // Filter models by organization for security and sidebar display
    const orgModelsForSidebar = useMemo(() => {
        return initialModels.map(model => {
            const metrics = data?.stats.modelMetrics?.find(m => m.model_slug === model.slug);
            return {
                id: model.id,
                slug: model.slug,
                name: model.name,
                imageUrl: model.image_url,
                isVerified: model.is_verified || false,
                totalViews: metrics?.total_views || 0,
                totalClicks: metrics?.total_clicks || 0,
            };
        });
    }, [initialModels, data?.stats.modelMetrics]);

    // Map available sources to match expected format
    const mappedAvailableSources = useMemo(() => {
        return (data?.availableSources || []).map(source => ({
            id: source.id || source.name.toLowerCase(),
            name: source.name,
            slug: source.slug || source.name.toLowerCase(),
            icon: source.icon || 'Link2',
            subtags: source.subtags || [],
        }));
    }, [data?.availableSources]);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                key: apiKey,
                period: filters.period,
                ...(filters.modelSlugs.length > 0 && { modelSlugs: JSON.stringify(filters.modelSlugs) }),
                ...(filters.country && { countries: filters.country }),
                ...(filters.sources.length > 0 && { sources: JSON.stringify(filters.sources) }),
                ...(filters.period === 'custom' && filters.startDate && { startDate: filters.startDate }),
                ...(filters.period === 'custom' && filters.endDate && { endDate: filters.endDate }),
            });

            const res = await fetch(`/api/org/analytics?${params}`);
            const result = await res.json();

            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Failed to fetch analytics');
            }

            setData(result.data);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [apiKey, filters]);

    // Initial load and filter changes
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Format chart data based on selected metric
    const chartData = useMemo((): ComparisonDataPoint[] => {
        if (!data) return [];
        return data.chartData.map(d => ({
            date: d.date,
            label: d.label || new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            current: comparisonMetric === 'views' ? d.views : d.clicks,
            previous: comparisonMetric === 'views' ? (d.visitsPrev || 0) : (d.clicksPrev || 0),
        }));
    }, [data, comparisonMetric]);

    // Prepare model comparison data
    const modelChartData = useMemo((): { data: ModelComparisonDataPoint[]; models: ChartModelInfo[] } | null => {
        if (!data?.modelComparison || filters.modelSlugs.length < 2) {
            return null;
        }

        const activeModels = data.availableModels.filter(m => filters.modelSlugs.includes(m.slug));

        const modelsInfo: ChartModelInfo[] = activeModels.map((m, index) => ({
            slug: m.slug,
            name: m.name,
            color: getModelColor(index),
        }));

        return {
            data: data.modelComparison as unknown as ModelComparisonDataPoint[],
            models: modelsInfo,
        };
    }, [data, filters.modelSlugs]);

    const showModelComparison = filters.modelSlugs.length >= 2 && modelChartData;

    // Selected model stats for panel
    const selectedModelStats = useMemo(() => {
        if (!selectedModel || !data) return null;
        const modelMetric = data.stats.modelMetrics?.find(m => m.model_slug === selectedModel.slug);
        const modelChartFiltered = data.chartData.map(d => {
            // In a real scenario, the API would return per-model chart data.
            // For now, we use the aggregated data or would need to filter by model if the API supported it.
            // The API currently returns aggregated chart data for selected models.
            // If only one model is chosen in filters, this is accurate.
            return d;
        });

        return {
            totalViews: modelMetric?.total_views || 0,
            totalClicks: modelMetric?.total_clicks || 0,
            ctr: modelMetric?.ctr_percentage || 0,
            countryBreakdown: (data.stats.topCountries || []).map(c => ({
                country: c.country,
                views: c.total_views,
                clicks: c.total_clicks
            })),
            chartData: modelChartFiltered.map(d => ({
                date: d.date,
                label: d.label,
                views: d.views,
                clicks: d.clicks,
                visitsPrev: d.visitsPrev,
                clicksPrev: d.clicksPrev
            })),
        };
    }, [selectedModel, data]);

    // Loading state
    const isInitialLoading = loading && !data;

    if (error) {
        return (
            <div className="min-h-screen bg-background p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-red-400 font-medium">Error: {error}</p>
                    <button
                        onClick={fetchData}
                        className="px-6 py-2 bg-[#7A27FF] text-white rounded-xl hover:bg-[#7A27FF]/80 transition-all font-bold"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <DashboardContainer
            sidebar={
                <SidebarModelList
                    models={orgModelsForSidebar}
                    selectedSlugs={filters.modelSlugs}
                    onSelectionChange={(slugs) => handleFiltersChange({ modelSlugs: slugs })}
                    onManageTrackingLinks={(model) => {
                        setTrackingModel({ id: model.id, name: model.name, slug: model.slug });
                        setIsTrackingManagerOpen(true);
                    }}
                    loading={loading}
                />
            }
            filters={
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                    <DashboardFiltersBar
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        availableCountries={data?.availableCountries || []}
                        availableSources={mappedAvailableSources}
                        isLoading={loading}
                    />
                    {lastUpdated && !loading && (
                        <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mt-1 sm:mt-0">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
            }
        >
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4 mb-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-[#00FF85]" />
                        <span className="font-bold text-foreground">Organization Manager</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle showLabels />
                    </div>
                </div>
            </header>

            {/* Loading Skeleton or Content */}
            {isInitialLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-white/10 rounded-xl p-6 animate-pulse">
                            <div className="h-4 bg-white/10 rounded w-20 mb-2" />
                            <div className="h-8 bg-white/10 rounded w-24" />
                        </div>
                    ))}
                </div>
            ) : data && (
                <div className="space-y-6 relative">
                    {/* Refresh Overlay Spinner */}
                    {loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-2xl">
                            <RefreshCw className="w-8 h-8 text-[#7A27FF] animate-spin" />
                        </div>
                    )}

                    {/* Empty State: No analytics data */}
                    {data.stats.totalViews === 0 && (
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
                    {data.stats.totalViews > 0 && (
                        <>
                            {/* Overview Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <StatCard
                                    title="Total Views"
                                    value={data.stats.totalViews}
                                    icon={<Eye className="w-5 h-5 text-[#00FF85]" />}
                                    change={data.stats.visitsChange}
                                    valueClassName="text-[#00FF85]"
                                />
                                <StatCard
                                    title="Total Clicks"
                                    value={data.stats.totalClicks}
                                    icon={<MousePointer className="w-5 h-5 text-[#7A27FF]" />}
                                    change={data.stats.clicksChange}
                                    valueClassName="text-[#7A27FF]"
                                />
                                <StatCard
                                    title="Conversion Rate"
                                    value={`${data.stats.ctr.toFixed(2)}%`}
                                    icon={<Percent className="w-5 h-5 text-[#D4AF37]" />}
                                    valueClassName="text-[#D4AF37]"
                                />
                            </div>

                            {/* Chart Section */}
                            <div className="glass-panel rounded-2xl p-6 border border-white/10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white">
                                        {showModelComparison ? `Comparing ${filters.modelSlugs.length} Models` : 'Traffic Over Time'}
                                    </h2>
                                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                                        <button
                                            onClick={() => setComparisonMetric('views')}
                                            className={cn(
                                                "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                                                comparisonMetric === 'views'
                                                    ? "bg-[#00FF85] text-black shadow-lg"
                                                    : "text-muted-foreground hover:text-white"
                                            )}
                                        >
                                            Views
                                        </button>
                                        <button
                                            onClick={() => setComparisonMetric('clicks')}
                                            className={cn(
                                                "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                                                comparisonMetric === 'clicks'
                                                    ? "bg-[#7A27FF] text-white shadow-lg"
                                                    : "text-muted-foreground hover:text-white"
                                            )}
                                        >
                                            Clicks
                                        </button>
                                    </div>
                                </div>

                                {showModelComparison ? (
                                    <ModelComparisonChart
                                        data={modelChartData!.data}
                                        models={modelChartData!.models}
                                        metric={comparisonMetric}
                                        onMetricChange={setComparisonMetric}
                                        height={350}
                                        className="p-0 border-none"
                                    />
                                ) : (
                                    <ComparisonChart
                                        data={chartData}
                                        metric={comparisonMetric}
                                        height={300}
                                        className="p-0 border-none"
                                    />
                                )}
                            </div>

                            {/* Models List */}
                            <div className="glass-panel rounded-2xl p-6 border border-white/10">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Your Models</h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Performance for selected period
                                        </p>
                                    </div>
                                    <div className="text-xs font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">
                                        {data.stats.modelMetrics?.length || 0} Models
                                    </div>
                                </div>

                                {initialModels.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                        <p className="text-muted-foreground">No models found</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {initialModels.map((model) => {
                                            const modelMetric = data.stats.modelMetrics?.find(m => m.model_slug === model.slug);
                                            return (
                                                <OrganizationModelCard
                                                    key={model.id}
                                                    model={model}
                                                    stats={{
                                                        views: modelMetric?.total_views || 0,
                                                        clicks: modelMetric?.total_clicks || 0,
                                                        ctr: modelMetric?.ctr_percentage || 0,
                                                    }}
                                                    onClick={() => {
                                                        setSelectedModel(model);
                                                        setIsPanelOpen(true);
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Model Detail Slide Panel */}
                            <ModelDetailPanel
                                isOpen={isPanelOpen}
                                onClose={() => setIsPanelOpen(false)}
                                model={selectedModel}
                                stats={selectedModelStats}
                            />

                            {/* Country Breakdown */}
                            {data.stats.topCountries.length > 0 && (
                                <div className="glass-panel rounded-2xl p-6 border border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-[#00FF85]" />
                                        Top Countries
                                    </h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                        {data.stats.topCountries.slice(0, 10).map(({ country, total_views, total_clicks }) => (
                                            <div
                                                key={country}
                                                className="p-4 rounded-xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all"
                                            >
                                                <p className="font-semibold text-white mb-2">{country}</p>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Views</span>
                                                        <span className="text-[#00FF85] font-bold">{total_views.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Clicks</span>
                                                        <span className="text-[#7A27FF] font-bold">{total_clicks.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Traffic Sources */}
                            {data.stats.topSources.length > 0 && (
                                <div className="glass-panel rounded-2xl p-6 border border-white/10">
                                    <h2 className="text-xl font-bold text-white mb-6">Traffic Sources</h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {data.stats.topSources.slice(0, 8).map((source) => (
                                            <div
                                                key={source.source_name}
                                                className="p-4 rounded-xl bg-white/5 border border-white/10"
                                            >
                                                <p className="font-semibold text-white truncate mb-2">{source.source_name}</p>
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-[#00FF85]">{source.total_views.toLocaleString()} views</span>
                                                    <span className="text-[#7A27FF]">{source.total_clicks.toLocaleString()} clicks</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {trackingModel && (
                <TrackingLinkManager
                    isOpen={isTrackingManagerOpen}
                    onClose={() => setIsTrackingManagerOpen(false)}
                    modelId={trackingModel.id}
                    modelSlug={trackingModel.slug}
                    modelName={trackingModel.name}
                    adminKey={apiKey}
                />
            )}
        </DashboardContainer>
    );
}
