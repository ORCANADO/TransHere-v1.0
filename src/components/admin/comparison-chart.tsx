// ============================================
// TRANSHERE v1.1 - COMPARISON CHART COMPONENT
// Current vs Previous Period Visualization
// ============================================

'use client';

import { useMemo } from 'react';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { useMaterialFlux } from '@/hooks/use-material-flux';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import type {
    ComparisonChartProps,
} from '@/types/charts';

/**
 * Custom Tooltip Component (Task 6.4)
 */
const CustomTooltip = ({ active, payload, label }: any) => {
    const { isLightMode } = useAdminTheme();
    if (!active || !payload) return null;

    return (
        <div className={cn(
            "px-4 py-3 rounded-xl min-w-[180px]",
            "backdrop-blur-[16px]",

            // Dark Mode
            "bg-[#3C3F40]/95",
            "border border-[#555D50]",
            "shadow-lg",

            // Light Mode  
            "data-[theme=light]:bg-white/95",
            "data-[theme=light]:border-[#CED9EF]/60"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
            <p className={cn(
                "font-semibold mb-2",
                "text-[#E2DFD2]",
                "data-[theme=light]:text-[#2E293A]"
            )} data-theme={isLightMode ? 'light' : 'dark'}>
                {label}
            </p>
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4 py-1">
                    <span className={cn(
                        "text-sm",
                        "text-[#9E9E9E]",
                        "data-[theme=light]:text-[#6B6B7B]"
                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                        {entry.name === 'current' ? 'Current Period' : 'Previous Period'}
                    </span>
                    <span className={cn(
                        "font-semibold text-sm",
                        entry.name === 'current' ? "text-[#7A27FF]" : "text-[#9E9E9E]"
                    )}>
                        {entry.value.toLocaleString()}
                    </span>
                </div>
            ))}
        </div>
    );
};

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
    const { isLightMode } = useAdminTheme();
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
            className={cn(
                "rounded-3xl p-6",
                "backdrop-blur-[16px]",

                // Dark Mode
                "bg-[#353839]/40",
                "border border-[#555D50]/30",

                // Light Mode
                "data-[theme=light]:bg-white/50",
                "data-[theme=light]:border-[#CED9EF]/40",
                className
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className={cn(
                    "text-lg font-semibold",
                    "text-[#E2DFD2]",
                    "data-[theme=light]:text-[#2E293A]"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                    {title || `Traffic Over Time (${metric === 'views' ? 'Page Views' : 'Clicks'})`}
                </h3>

                {/* Views/Clicks Toggle (Task 6.2) */}
                {onMetricChange && (
                    <div className={cn(
                        "inline-flex p-1 rounded-xl",
                        "bg-[#353839]/60",
                        "data-[theme=light]:bg-[#CED9EF]/30"
                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                        {['Views', 'Clicks'].map((m) => {
                            const value = m.toLowerCase() as 'views' | 'clicks';
                            const isActive = metric === value;
                            return (
                                <button
                                    key={m}
                                    onClick={() => onMetricChange(value)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                                        isActive
                                            ? cn(
                                                "bg-[#5B4965]/50 text-[#E2DFD2]",
                                                "data-[theme=light]:bg-white/80 data-[theme=light]:text-[#2E293A]"
                                            )
                                            : cn(
                                                "text-[#9E9E9E] hover:text-[#E2DFD2]",
                                                "data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#2E293A]"
                                            )
                                    )}
                                    data-theme={isLightMode ? 'light' : 'dark'}
                                >
                                    {m}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Custom Legend (Task 6.3) */}
            {showLegend && (
                <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#7A27FF]"></span>
                        <span className={cn(
                            "text-sm",
                            "text-[#E2DFD2]",
                            "data-[theme=light]:text-[#2E293A]"
                        )} data-theme={isLightMode ? 'light' : 'dark'}>
                            Current Period
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#9E9E9E]/50"></span>
                        <span className={cn(
                            "text-sm",
                            "text-[#9E9E9E]",
                            "data-[theme=light]:text-[#6B6B7B]"
                        )} data-theme={isLightMode ? 'light' : 'dark'}>
                            Previous Period
                        </span>
                    </div>
                </div>
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
                            stroke={isLightMode ? '#CED9EF' : '#555D50'}
                            strokeOpacity={0.2}
                            vertical={false}
                        />

                        {/* X Axis (Task 6.5) */}
                        <XAxis
                            dataKey="label"
                            stroke={isLightMode ? '#CED9EF' : '#555D50'}
                            tick={{ fill: isLightMode ? '#6B6B7B' : '#9E9E9E', fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: isLightMode ? '#CED9EF' : '#555D50' }}
                            tickMargin={12}
                        />

                        {/* Y Axis (Task 6.5) */}
                        <YAxis
                            stroke={isLightMode ? '#CED9EF' : '#555D50'}
                            tick={{ fill: isLightMode ? '#6B6B7B' : '#9E9E9E', fontSize: 12 }}
                            tickLine={false}
                            axisLine={{ stroke: isLightMode ? '#CED9EF' : '#555D50' }}
                            tickMargin={12}
                            tickFormatter={(value) => {
                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                                return value.toString();
                            }}
                        />

                        {/* Custom Tooltip */}
                        <Tooltip content={<CustomTooltip />} />

                        {/* Previous Period Line - Dashed, Muted */}
                        <Line
                            type="monotone"
                            dataKey="previous"
                            name="previous"
                            stroke={isLightMode ? "#6B6B7B" : "#9E9E9E"}
                            strokeWidth={2}
                            strokeOpacity={0.5}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, fill: isLightMode ? '#6B6B7B' : '#9E9E9E', strokeWidth: 0 }}
                        />

                        {/* Current Period Line - Solid, Violet */}
                        <Line
                            type="monotone"
                            dataKey="current"
                            name="current"
                            stroke="#7A27FF"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: '#7A27FF', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
