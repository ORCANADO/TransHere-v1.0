// ============================================
// TRANSHERE v1.1 - MODEL COMPARISON CHART
// Multi-Model Line Comparison with Metric Toggle
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
    Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import type {
    ModelComparisonChartProps,
    ChartModelInfo
} from '@/types/charts';

/**
 * Custom Tooltip for Model Comparison (iOS 26)
 */
const ModelComparisonTooltip = ({ active, payload, label, models }: any) => {
    const { isLightMode } = useAdminTheme();
    if (!active || !payload || payload.length === 0) return null;

    const sortedPayload = [...payload].sort((a, b) => (b.value as number) - (a.value as number));

    return (
        <div className={cn(
            "px-4 py-3 rounded-xl min-w-[220px]",
            "backdrop-blur-[16px]",
            "bg-[#3C3F40]/95 border border-[#555D50] shadow-xl",
            "data-[theme=light]:bg-white/95 data-[theme=light]:border-[#CED9EF]/60"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
            <p className={cn("font-semibold mb-3 border-b pb-2", "text-[#E2DFD2] border-[#555D50]/30", "data-[theme=light]:text-[#2E293A] data-[theme=light]:border-[#CED9EF]/30")} data-theme={isLightMode ? 'light' : 'dark'}>{label}</p>
            <div className="space-y-2">
                {sortedPayload.map((entry: any) => {
                    const model = (models as ChartModelInfo[]).find(m => m.slug === entry.dataKey);
                    return (
                        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className={cn("text-sm", "text-[#9E9E9E]", "data-[theme=light]:text-[#6B6B7B]")} data-theme={isLightMode ? 'light' : 'dark'}>
                                    {model?.name || entry.dataKey}
                                </span>
                            </div>
                            <span className={cn("text-sm font-bold", "text-[#E2DFD2]", "data-[theme=light]:text-[#2E293A]")} data-theme={isLightMode ? 'light' : 'dark'}>
                                {(entry.value as number).toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export function ModelComparisonChart({
    data,
    models,
    metric,
    onMetricChange,
    title = 'Model Comparison',
    height = 350,
    className,
}: ModelComparisonChartProps) {
    const fluxRef = useMaterialFlux<HTMLDivElement>();
    const { isLightMode } = useAdminTheme();

    const chartData = useMemo(() => data.map(point => ({ ...point, label: point.label || point.date })), [data]);

    if (!data || data.length === 0 || models.length === 0) {
        return (
            <div className={cn("rounded-3xl p-6 flex items-center justify-center bg-[#353839]/40 border border-[#555D50]/30", className)} style={{ height }}>
                <p className="text-[#9E9E9E]">Select models to compare performance</p>
            </div>
        );
    }

    return (
        <div ref={fluxRef} className={cn("rounded-3xl p-6 backdrop-blur-[16px] bg-[#353839]/40 border border-[#555D50]/30 data-[theme=light]:bg-white/50 data-[theme=light]:border-[#CED9EF]/40", className)} data-theme={isLightMode ? 'light' : 'dark'}>
            <div className="flex items-center justify-between mb-6">
                <h3 className={cn("text-lg font-semibold text-[#E2DFD2] data-[theme=light]:text-[#2E293A]")} data-theme={isLightMode ? 'light' : 'dark'}>{title}</h3>
                {onMetricChange && (
                    <div className={cn("inline-flex p-1 rounded-xl bg-[#353839]/60 data-[theme=light]:bg-[#CED9EF]/30")} data-theme={isLightMode ? 'light' : 'dark'}>
                        {['Views', 'Clicks'].map((m) => {
                            const value = m.toLowerCase() as 'views' | 'clicks';
                            const isActive = metric === value;
                            return (
                                <button
                                    key={m}
                                    onClick={() => onMetricChange(value)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                                        isActive ? "bg-[#5B4965]/50 text-[#E2DFD2] data-[theme=light]:bg-white/80 data-[theme=light]:text-[#2E293A]" : "text-[#9E9E9E] hover:text-[#E2DFD2] data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#2E293A]"
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

            <div style={{ height, minHeight: height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isLightMode ? '#CED9EF' : '#555D50'} strokeOpacity={0.2} vertical={false} />
                        <XAxis dataKey="label" stroke={isLightMode ? '#CED9EF' : '#555D50'} tick={{ fill: isLightMode ? '#6B6B7B' : '#9E9E9E', fontSize: 12 }} tickLine={false} axisLine={{ stroke: isLightMode ? '#CED9EF' : '#555D50' }} tickMargin={12} />
                        <YAxis stroke={isLightMode ? '#CED9EF' : '#555D50'} tick={{ fill: isLightMode ? '#6B6B7B' : '#9E9E9E', fontSize: 12 }} tickLine={false} axisLine={{ stroke: isLightMode ? '#CED9EF' : '#555D50' }} tickMargin={12} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v} />
                        <Tooltip content={<ModelComparisonTooltip models={models} />} />
                        <Legend verticalAlign="bottom" height={36} formatter={(value) => {
                            const model = models.find(m => m.slug === value);
                            return <span className={cn("text-xs font-bold mr-4", "text-[#9E9E9E]", "data-[theme=light]:text-[#6B6B7B]")} data-theme={isLightMode ? 'light' : 'dark'}>{model?.name || value}</span>
                        }} />
                        {models.map((model) => (
                            <Line key={model.slug} type="monotone" dataKey={model.slug} name={model.slug} stroke={model.color} strokeWidth={2} dot={false} activeDot={{ r: 6, fill: model.color, stroke: '#fff', strokeWidth: 2 }} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
