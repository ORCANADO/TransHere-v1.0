// Analytics Aggregated Data Types
// For materialized view query results

// ============================================
// DAILY STATS TYPES
// ============================================

export interface DailyStats {
    date: string;  // ISO date string (YYYY-MM-DD)
    model_slug: string;
    country: string;
    traffic_source: string;  // tracking_link_id or 'organic'
    views: number;
    clicks: number;
    total_events: number;
}

export interface DailyStatsAggregated {
    date: string;
    views: number;
    clicks: number;
    ctr: number;
}

// ============================================
// HOURLY STATS TYPES
// ============================================

export interface HourlyStats {
    hour: string;  // ISO timestamp
    model_slug: string;
    tracking_link_id: string | null;
    country: string;
    views: number;
    clicks: number;
}

// ============================================
// SOURCE SUMMARY TYPES
// ============================================

export interface SourceSummary {
    source_name: string;
    subtag_name: string | null;
    total_events: number;
    total_views: number;
    total_clicks: number;
    models_count: number;
    countries_count: number;
    first_event: string;
    last_event: string;
}

// ============================================
// MODEL SUMMARY TYPES
// ============================================

export interface ModelSummary {
    model_slug: string;
    total_views: number;
    total_clicks: number;
    unique_countries: number;
    active_days: number;
    first_event: string;
    last_event: string;
    ctr_percentage: number;
}

// ============================================
// COUNTRY SUMMARY TYPES
// ============================================

export interface CountrySummary {
    country: string;
    total_events: number;
    total_views: number;
    total_clicks: number;
    models_visited: number;
    active_days: number;
}

// ============================================
// REFRESH STATUS TYPES
// ============================================

export interface RefreshStatus {
    timestamp: string | null;
    duration_ms: number | null;
    status: 'success' | 'error' | 'never' | 'in_progress';
    error_message?: string;
    error_detail?: string;
    views_refreshed?: string[];
}

export interface SystemConfig {
    key: string;
    value: RefreshStatus | { value: number };
    updated_at: string;
    created_at: string;
}

// ============================================
// DASHBOARD DATA TYPES
// ============================================

export interface DashboardStats {
    totalViews: number;
    totalClicks: number;
    ctr: number;
    uniqueCountries: number;
    visitsChange?: number;
    clicksChange?: number;
    mainLayoutVisits?: number;
    trackingLinkVisits?: number;
    topSources: SourceSummary[];
    topCountries: CountrySummary[];
    topModels: ModelSummary[];
    modelMetrics?: ModelSummary[];
}

export interface ChartDataPoint {
    date: string;
    views: number;
    clicks: number;
    visitsPrev?: number;
    clicksPrev?: number;
    label?: string;
}

export interface AggregatedModelComparisonDataPoint {
    date: string;
    [modelSlug: string]: number | string;  // Dynamic keys for each model
}

export interface AggregatedDashboardFilters {
    startDate: string;
    endDate: string;
    models: string[];
    sources: string[];
    subtags: string[];
    countries: string[];
}

import type { SourceOption } from './analytics';

export interface AggregatedTrafficSourceOption extends SourceOption {
    id: string;
    slug: string;
    subtags?: {
        id: string;
        name: string;
        slug: string;
    }[];
}

export interface AggregatedModelFilterOption {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
}

export interface DashboardResponse {
    stats: DashboardStats;
    chartData: ChartDataPoint[];
    modelComparisonViews?: AggregatedModelComparisonDataPoint[];
    modelComparisonClicks?: AggregatedModelComparisonDataPoint[];
    lastRefresh: RefreshStatus;
    queryTime: number;
    availableCountries: string[];
    availableSources: AggregatedTrafficSourceOption[];
    availableModels: AggregatedModelFilterOption[];
    allModelMetrics?: ModelSummary[];
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface RefreshViewsResponse {
    success: boolean;
    data?: RefreshStatus;
    error?: string;
}

export interface DashboardQueryParams {
    startDate: string;
    endDate: string;
    models?: string;      // Comma-separated slugs
    sources?: string;     // Comma-separated source names
    countries?: string;   // Comma-separated country codes
}
