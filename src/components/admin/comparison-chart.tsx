// ============================================
// TRANSHERE v1.1 - COMPARISON CHART COMPONENT
// Current vs Previous Period Visualization
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
    ComparisonChartProps,
    ComparisonDataPoint,
    ChartTooltipPayload
} from '@/types/charts';

/**
 * Calculate percentage change between two values
 */
function calculateDelta(current: number, previous: number): string {
    if (previous === 0) {
        return current > 0 ? '+∞%' : '0%';
    }
    const delta = ((current - previous) / previous) * 100;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
}

/**
 * Custom Tooltip Component with Delta Calculation
 */
function CustomTooltip(props: any) {
    const { active, payload, label } = props;
    if (!active || !payload || payload.length < 2) {
        return null;
    }

    const currentData = (payload as any[]).find(p => p.dataKey === 'current');
    const previousData = (payload as any[]).find(p => p.dataKey === 'previous');

    const current = currentData?.value ?? 0;
    const previous = previousData?.value ?? 0;
    const delta = calculateDelta(current, previous);
    const isPositive = current >= previous;

    return (
        <div className="bg-white/90 dark:bg-[#0A1221]/90 backdrop-blur-2xl rounded-2xl p-4 min-w-[180px] shadow-2xl border border-black/[0.05] dark:border-white/10">
            {/* Date Label */}
            <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white mb-3 pb-2 border-b border-black/[0.05] dark:border-white/10">
                {label}
            </p>

            {/* Current Period */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: '#007AFF' }}
                    />
                    <span className="text-sm text-[#86868B] dark:text-muted-foreground">Current</span>
                </div>
                <span className="text-sm font-bold text-[#1D1D1F] dark:text-white">
                    {current.toLocaleString()}
                </span>
            </div>

            {/* Previous Period */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full opacity-30"
                        style={{ backgroundColor: '#86868B' }}
                    />
                    <span className="text-sm text-[#86868B]/70 dark:text-muted-foreground">Previous</span>
                </div>
                <span className="text-sm font-semibold text-[#86868B]/70 dark:text-muted-foreground">
                    {previous.toLocaleString()}
                </span>
            </div>

            {/* Delta Calculation */}
            <div className="pt-2 border-t border-black/[0.05] dark:border-white/10">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[#86868B] dark:text-muted-foreground">Change</span>
                    <span
                        className={cn(
                            "text-sm font-bold",
                            isPositive ? "text-[#00C853] dark:text-[#00FF85]" : "text-red-500 dark:text-red-400"
                        )}
                    >
                        {delta}
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * ComparisonChart - Current vs Previous Period Line Chart
 * 
 * Visual Design:
 * - Current period: Solid Electric Emerald line (#00FF85)
 * - Previous period: Dashed muted line (50% opacity)
 * - Minimalist aesthetic: Hidden axis lines
 * - Custom tooltip with percentage delta
 */
export function ComparisonChart({
    data,
    title,
    metric = 'views',
    height = 300,
    showLegend = true,
    className,
}: ComparisonChartProps) {
    // Memoize formatted data for performance
    const chartData = useMemo(() => {
        return data.map(point => ({
            ...point,
            label: point.label || point.date,
        }));
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div
                className={cn(
                    "liquid-glass rounded-xl p-6 flex items-center justify-center",
                    className
                )}
                style={{ height }}
            >
                <p className="text-muted-foreground">No data available for this period</p>
            </div>
        );
    }

    return (
        <div className={cn("rounded-2xl p-4 lg:p-6", className)}>
            {title && (
                <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-white mb-4">
                    {title}
                </h3>
            )}

            <div style={{ height, minHeight: height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                        {/* Subtle Grid Lines */}
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
                        <Tooltip content={<CustomTooltip />} />

                        {/* Legend */}
                        {showLegend && (
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                height={36}
                                formatter={(value: string) => (
                                    <span className="text-xs font-medium text-[#86868B] dark:text-muted-foreground mr-4">
                                        {value === 'current' ? 'Current Period' : 'Previous Period'}
                                    </span>
                                )}
                            />
                        )}

                        {/* Previous Period Line - Dashed, Muted */}
                        <Line
                            type="monotone"
                            dataKey="previous"
                            name="previous"
                            stroke="#86868B"
                            strokeWidth={2}
                            strokeOpacity={0.3}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, fill: '#86868B', strokeWidth: 0 }}
                        />

                        {/* Current Period Line - Solid, Apple Blue */}
                        <Line
                            type="monotone"
                            dataKey="current"
                            name="current"
                            stroke="#007AFF"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: '#007AFF', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
