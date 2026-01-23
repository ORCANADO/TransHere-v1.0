// ============================================
// TRANSHERE v1.1 - COMPARISON CHART COMPONENT
// Current vs Previous Period Visualization
// ============================================

'use client';

import { useMemo } from 'react';
import { useMaterialFlux } from '@/hooks/use-material-flux';
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
        <div className="bg-[var(--surface-obsidian-raised)]/95 liquid-light:bg-[var(--surface-irid-glass)] backdrop-blur-[40px] saturate-[180%] rounded-2xl p-4 min-w-[180px] shadow-[var(--shadow-ao-stack)] liquid-light:shadow-[var(--shadow-ao-light)] border border-[var(--border-obsidian-rim)]/40 liquid-light:border-white/60">
            {/* Date Label */}
            <p className="text-sm font-bold text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)] mb-3 pb-2 border-b border-[var(--border-obsidian-rim)]/20 liquid-light:border-white/30">
                {label}
            </p>

            {/* Current Period */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: 'var(--accent-violet)' }}
                    />
                    <span className="text-sm text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60">Current</span>
                </div>
                <span className="text-sm font-bold text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]">
                    {current.toLocaleString()}
                </span>
            </div>

            {/* Previous Period */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full opacity-30"
                        style={{ backgroundColor: 'var(--text-obsidian-muted)' }}
                    />
                    <span className="text-sm text-[var(--text-obsidian-muted)]/70 liquid-light:text-[var(--text-irid-primary)]/50">Previous</span>
                </div>
                <span className="text-sm font-semibold text-[var(--text-obsidian-muted)]/70 liquid-light:text-[var(--text-irid-primary)]/50">
                    {previous.toLocaleString()}
                </span>
            </div>

            {/* Delta Calculation */}
            <div className="pt-2 border-t border-[var(--border-obsidian-rim)]/20 liquid-light:border-white/30">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60">Change</span>
                    <span
                        className={cn(
                            "text-sm font-bold",
                            isPositive ? "text-accent-emerald" : "text-accent-red"
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
    onMetricChange,
    height = 300,
    showLegend = true,
    className,
}: ComparisonChartProps) {
    const fluxRef = useMaterialFlux<HTMLDivElement>();
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
        <div
            ref={fluxRef}
            className={cn("rounded-2xl p-4 lg:p-6 flux-border", className)}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                {title && (
                    <h3 className="text-lg font-bold text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]">
                        {title}
                    </h3>
                )}

                {/* Metric Toggle */}
                {onMetricChange && (
                    <div className="flex p-1 bg-[var(--surface-obsidian-glass)]/40 liquid-light:bg-[var(--surface-irid-glass)] backdrop-blur-md rounded-xl border border-[var(--border-obsidian-rim)]/30 liquid-light:border-white/60 self-start sm:self-auto">
                        <button
                            onClick={() => onMetricChange('views')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200",
                                metric === 'views'
                                    ? "bg-accent-violet text-white shadow-lg shadow-accent-violet/20"
                                    : "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 hover:text-[var(--text-obsidian-primary)] liquid-light:hover:text-[var(--text-irid-primary)]"
                            )}
                        >
                            Views
                        </button>
                        <button
                            onClick={() => onMetricChange('clicks')}
                            className={cn(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200",
                                metric === 'clicks'
                                    ? "bg-accent-violet text-white shadow-lg shadow-accent-violet/20"
                                    : "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 hover:text-[var(--text-obsidian-primary)] liquid-light:hover:text-[var(--text-irid-primary)]"
                            )}
                        >
                            Clicks
                        </button>
                    </div>
                )}
            </div>

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
                            stroke="var(--text-obsidian-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                        />

                        {/* Y Axis - Hidden axis line */}
                        <YAxis
                            stroke="var(--text-obsidian-muted)"
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
                                    <span className="text-xs font-bold text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 mr-4">
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
                            stroke="var(--text-obsidian-muted)"
                            strokeWidth={2}
                            strokeOpacity={0.2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, fill: 'var(--text-obsidian-muted)', strokeWidth: 0 }}
                        />

                        {/* Current Period Line - Solid, Apple Blue */}
                        <Line
                            type="monotone"
                            dataKey="current"
                            name="current"
                            stroke="var(--accent-violet)"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: 'var(--accent-violet)', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
