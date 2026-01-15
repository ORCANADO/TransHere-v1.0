// ============================================
// TRANSHERE v1.1 - CHART TYPE DEFINITIONS
// ============================================

/**
 * Single data point for current vs previous comparison
 */
export interface ComparisonDataPoint {
    date: string;           // ISO date string or formatted label
    label: string;          // Display label (e.g., "Jan 15")
    current: number;        // Current period value
    previous: number;       // Previous period value
}

/**
 * Props for the ComparisonChart component
 */
export interface ComparisonChartProps {
    data: ComparisonDataPoint[];
    title?: string;
    metric?: 'views' | 'clicks';
    height?: number;
    showLegend?: boolean;
    className?: string;
}

/**
 * Single data point for multi-model comparison
 * Dynamic keys for each model slug
 */
export interface ModelComparisonDataPoint {
    date: string;
    label: string;
    [modelSlug: string]: number | string;  // Dynamic model values
}

/**
 * Model info for chart legend and colors
 */
export interface ChartModelInfo {
    slug: string;
    name: string;
    color: string;
}

/**
 * Props for the ModelComparisonChart component
 */
export interface ModelComparisonChartProps {
    data: ModelComparisonDataPoint[];
    models: ChartModelInfo[];
    metric: 'views' | 'clicks';
    onMetricChange: (metric: 'views' | 'clicks') => void;
    title?: string;
    height?: number;
    className?: string;
}

/**
 * Dashboard filter state
 */
export interface DashboardFilters {
    period: TimePeriod;
    startDate: string | null;
    endDate: string | null;
    country: string | null;
    sourceId: string | null;
    subtagId: string | null;
    modelSlugs: string[];
}

/**
 * Time period options
 */
export type TimePeriod =
    | 'hour'
    | 'today'
    | '7days'
    | '30days'
    | '90days'
    | 'all'
    | 'custom';

/**
 * Traffic source for filter dropdown
 */
export interface TrafficSourceOption {
    id: string;
    name: string;
    slug: string;
    subtags?: {
        id: string;
        name: string;
        slug: string;
    }[];
}

/**
 * Model option for filter dropdown
 */
export interface ModelFilterOption {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
}

/**
 * Custom tooltip payload from Recharts
 */
export interface ChartTooltipPayload {
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: ComparisonDataPoint | ModelComparisonDataPoint;
}

/**
 * Chart color palette (8 distinct colors for model comparison)
 */
export const CHART_COLORS: readonly string[] = [
    '#00FF85',  // Electric Emerald (primary)
    '#7A27FF',  // Cyber Violet
    '#D4AF37',  // Rich Gold
    '#00C9A7',  // Teal
    '#F59E0B',  // Amber
    '#EC4899',  // Pink
    '#8B5CF6',  // Purple
    '#10B981',  // Green
    '#F97316',  // Orange
    '#06B6D4',  // Cyan
] as const;

/**
 * Get color for a model by index
 */
export function getModelColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length];
}
