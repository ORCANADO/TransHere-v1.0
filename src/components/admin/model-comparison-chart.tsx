// ============================================
// TRANSHERE v1.1 - MODEL COMPARISON CHART
// Multi-Model Line Comparison with Metric Toggle
// ============================================

'use client';

import { useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    TooltipProps,
} from 'recharts';
import { cn } from '@/lib/utils';
import type {
    ModelComparisonChartProps,
    ModelComparisonDataPoint,
    ChartModelInfo
} from '@/types/charts';

/**
 * Custom Tooltip for Model Comparison
 */
function ModelComparisonTooltip(props: any) {
    const { active, payload, label, models } = props;
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    // Sort by value descending
    const sortedPayload = [...payload].sort((a, b) =>
        (b.value as number) - (a.value as number)
    );

    return (
        <div className="bg-white/90 dark:bg-[#0A1221]/90 backdrop-blur-2xl rounded-2xl p-4 min-w-[200px] max-w-[300px] shadow-2xl border border-black/[0.05] dark:border-white/10">
            {/* Date Label */}
            <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white mb-3 pb-2 border-b border-black/[0.05] dark:border-white/10">
                {label}
            </p>

            {/* Model Values */}
            <div className="space-y-2">
                {sortedPayload.map((entry: any) => {
                    const model = (models as ChartModelInfo[]).find(m => m.slug === entry.dataKey);
                    return (
                        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                                <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-sm text-[#86868B] dark:text-muted-foreground truncate font-medium">
                                    {model?.name || entry.dataKey}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-[#1D1D1F] dark:text-white flex-shrink-0">
                                {(entry.value as number).toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Metric Toggle Button Component
 */
function MetricToggle({
    metric,
    onMetricChange,
}: {
    metric: 'views' | 'clicks';
    onMetricChange: (metric: 'views' | 'clicks') => void;
}) {
    return (
        <div className="flex items-center gap-1 bg-black/[0.05] dark:bg-white/5 rounded-xl p-1 border border-black/[0.05] dark:border-white/5">
            <button
                onClick={() => onMetricChange('views')}
                className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                    metric === 'views'
                        ? "bg-white dark:bg-[#007AFF] text-[#007AFF] dark:text-white shadow-sm"
                        : "text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
                )}
            >
                Views
            </button>
            <button
                onClick={() => onMetricChange('clicks')}
                className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200",
                    metric === 'clicks'
                        ? "bg-white dark:bg-[#AF52DE] text-[#AF52DE] dark:text-white shadow-sm"
                        : "text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
                )}
            >
                Clicks
            </button>
        </div>
    );
}

/**
 * ModelComparisonChart - Multi-Model Line Comparison
 * 
 * Features:
 * - Dynamic lines for each selected model
 * - Automatic color assignment from palette
 * - Views/Clicks toggle
 * - Smooth monotone curves
 * - Custom tooltip with all model values
 */
export function ModelComparisonChart({
    data,
    models,
    metric,
    onMetricChange,
    title = 'Model Comparison',
    height = 350,
    className,
}: ModelComparisonChartProps) {
    // Memoize chart data
    const chartData = useMemo(() => {
        return data.map(point => ({
            ...point,
            label: point.label || point.date,
        }));
    }, [data]);

    if (!data || data.length === 0 || models.length === 0) {
        return (
            <div
                className={cn(
                    "liquid-glass rounded-xl p-6 flex items-center justify-center",
                    className
                )}
                style={{ height }}
            >
                <p className="text-[#86868B] dark:text-muted-foreground">
                    Select models to compare their performance
                </p>
            </div>
        );
    }

    return (
        <div className={cn("rounded-2xl p-4 lg:p-6", className)}>
            {/* Header with Title and Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">
                    {title}
                </h3>
                {onMetricChange && <MetricToggle metric={metric} onMetricChange={onMetricChange} />}
            </div>

            {/* Chart */}
            <div style={{ height, minHeight: height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                        {/* Subtle Grid */}
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(148, 163, 184, 0.1)"
                            vertical={false}
                        />

                        {/* X Axis - Minimalist */}
                        <XAxis
                            dataKey="label"
                            stroke="#86868B"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                        />

                        {/* Y Axis - Hidden axis line */}
                        <YAxis
                            stroke="#86868B"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            tickFormatter={(value) => {
                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                                return value.toString();
                            }}
                        />

                        {/* Custom Tooltip */}
                        <Tooltip
                            content={(props) => <ModelComparisonTooltip {...props} models={models} />}
                        />

                        {/* Legend */}
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value: string) => {
                                const model = models.find(m => m.slug === value);
                                return (
                                    <span className="text-xs font-semibold text-[#86868B] dark:text-muted-foreground mr-4">
                                        {model?.name || value}
                                    </span>
                                );
                            }}
                        />

                        {/* Dynamic Lines for Each Model */}
                        {models.map((model, index) => (
                            <Line
                                key={model.slug}
                                type="monotone"
                                dataKey={model.slug}
                                name={model.slug}
                                stroke={model.color}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{
                                    r: 6,
                                    fill: model.color,
                                    stroke: '#fff',
                                    strokeWidth: 2,
                                }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Model Count Indicator */}
            <div className="mt-4 pt-4 border-t border-black/[0.05] dark:border-white/10">
                <p className="text-xs font-medium text-[#86868B] dark:text-muted-foreground">
                    Comparing {models.length} model{models.length !== 1 ? 's' : ''} •
                    Showing {metric === 'views' ? 'page views' : 'clicks'} over time
                </p>
            </div>
        </div>
    );
}
