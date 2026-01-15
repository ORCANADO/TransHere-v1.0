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
function CustomTooltip({
    active,
    payload,
    label
}: TooltipProps<number, string>) {
    if (!active || !payload || payload.length < 2) {
        return null;
    }

    const currentData = payload.find(p => p.dataKey === 'current');
    const previousData = payload.find(p => p.dataKey === 'previous');

    const current = currentData?.value ?? 0;
    const previous = previousData?.value ?? 0;
    const delta = calculateDelta(current, previous);
    const isPositive = current >= previous;

    return (
        <div className="liquid-glass-elevated rounded-xl p-4 min-w-[180px]">
            {/* Date Label */}
            <p className="text-sm font-medium text-foreground mb-3 pb-2 border-b border-white/10">
                {label}
            </p>

            {/* Current Period */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: '#00FF85' }}
                    />
                    <span className="text-sm text-muted-foreground">Current</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                    {current.toLocaleString()}
                </span>
            </div>

            {/* Previous Period */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full opacity-50"
                        style={{ backgroundColor: '#94A3B8' }}
                    />
                    <span className="text-sm text-muted-foreground">Previous</span>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                    {previous.toLocaleString()}
                </span>
            </div>

            {/* Delta Calculation */}
            <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Change</span>
                    <span
                        className={cn(
                            "text-sm font-bold",
                            isPositive ? "text-[#00FF85]" : "text-red-400"
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
        <div className={cn("liquid-glass rounded-xl p-4 lg:p-6", className)}>
            {title && (
                <h3 className="text-lg font-semibold text-foreground mb-4">
                    {title}
                </h3>
            )}

            <div style={{ height }}>
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
                            stroke="#94A3B8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                        />

                        {/* Y Axis - Hidden axis line */}
                        <YAxis
                            stroke="#94A3B8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
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
                                height={36}
                                formatter={(value: string) => (
                                    <span className="text-sm text-muted-foreground">
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
                            stroke="#94A3B8"
                            strokeWidth={2}
                            strokeOpacity={0.5}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, fill: '#94A3B8' }}
                        />

                        {/* Current Period Line - Solid, Electric Emerald */}
                        <Line
                            type="monotone"
                            dataKey="current"
                            name="current"
                            stroke="#00FF85"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6, fill: '#00FF85' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
