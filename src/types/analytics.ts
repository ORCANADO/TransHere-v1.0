// Analytics event from database (matches actual schema)
export interface AnalyticsEvent {
  id: string;
  event_type: 'view' | 'click_social' | 'click_content';
  model_id: string | null;
  model_slug: string | null;
  page_path: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  user_agent: string | null;
  created_at: string;
}

// Time period filter options
export type TimePeriod = 'hour' | 'today' | '7days' | '30days' | '90days' | 'all' | 'custom';

// Aggregated stats
export interface OverviewStats {
  totalVisits: number;
  totalClicks: number;
  conversionRate: number;
  uniqueCountries: number;
  visitsChange: number; // % change from previous period
  clicksChange: number;
}

// Per-model analytics (with joined model data)
export interface ModelAnalytics {
  modelId: string;
  modelSlug: string;
  modelName: string;
  imageUrl?: string | null;
  visits: number;
  clicks: number;
  conversionRate: number;
  topCountries: { country: string; count: number }[];
  dailyData: { date: string; visits: number; clicks: number }[];
}

// Chart data point
export interface ChartDataPoint {
  date: string;
  label: string; // Formatted date for display
  visits: number;
  clicks: number;
}

// Full dashboard response
export interface DashboardData {
  overview: OverviewStats;
  chartData: ChartDataPoint[];
  modelAnalytics: ModelAnalytics[];
  countryBreakdown: { country: string; visits: number; clicks: number }[];
  availableCountries: string[];
}
