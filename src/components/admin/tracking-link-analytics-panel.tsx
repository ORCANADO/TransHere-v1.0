'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { ChevronUp, Loader2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import type { TrackingLinkAnalyticsResponse, TrackingLinkDailyStats } from '@/types/tracking';

type Period = '7d' | '30d' | '90d' | 'all' | 'custom';

interface TrackingLinkAnalyticsPanelProps {
    linkId: string;
    linkSlug: string;
    adminKey: string;
    isLightMode: boolean;
    onCollapse: () => void;
}

function getDateRange(period: Period): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start: string;

    switch (period) {
        case '7d':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
        case '30d':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
        case '90d':
            start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            break;
        case 'all':
            start = '2024-01-01';
            break;
        default:
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { start, end };
}

function formatLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PERIODS: { value: Period; label: string }[] = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: 'all', label: 'All' },
];

function CustomTooltip({ active, payload, label, isLightMode }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className={cn(
            "px-3 py-2 rounded-xl shadow-lg text-xs",
            isLightMode
                ? "bg-white/95 border border-[#CED9EF]/60 text-[#2E293A]"
                : "bg-[#3C3F40]/95 border border-[#555D50] text-[#E2DFD2]"
        )}>
            <p className="font-semibold mb-1">{label}</p>
            {payload.map((entry: any) => (
                <p key={entry.dataKey} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                    <span className="capitalize">{entry.dataKey}:</span>
                    <span className="font-bold">{entry.value.toLocaleString()}</span>
                </p>
            ))}
        </div>
    );
}

export function TrackingLinkAnalyticsPanel({
    linkId,
    linkSlug,
    adminKey,
    isLightMode,
    onCollapse,
}: TrackingLinkAnalyticsPanelProps) {
    const [activePeriod, setActivePeriod] = useState<Period>('7d');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState<TrackingLinkAnalyticsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Set initial dates based on default period
    useEffect(() => {
        const { start, end } = getDateRange('7d');
        setStartDate(start);
        setEndDate(end);
    }, []);

    // Fetch data when dates change
    useEffect(() => {
        if (!startDate || !endDate) return;

        const controller = new AbortController();
        let cancelled = false;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `/api/admin/tracking-links/${linkId}/analytics?key=${adminKey}&startDate=${startDate}&endDate=${endDate}`,
                    { signal: controller.signal }
                );
                if (cancelled) return;

                const json = await res.json();
                if (!json.success) {
                    throw new Error(json.error || 'Failed to fetch');
                }
                setData(json.data);
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                setError(err.message || 'Failed to load analytics');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchData();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [linkId, adminKey, startDate, endDate]);

    const handlePeriodChange = useCallback((period: Period) => {
        setActivePeriod(period);
        if (period !== 'custom') {
            const { start, end } = getDateRange(period);
            setStartDate(start);
            setEndDate(end);
        }
    }, []);

    const handleStartDateChange = useCallback((val: string) => {
        setActivePeriod('custom');
        setStartDate(val);
    }, []);

    const handleEndDateChange = useCallback((val: string) => {
        setActivePeriod('custom');
        setEndDate(val);
    }, []);

    // Prepare chart data
    const chartData = (data?.daily || []).map((d: TrackingLinkDailyStats) => ({
        ...d,
        label: formatLabel(d.date),
    }));

    const summary = data?.summary;

    return (
        <div
            className={cn(
                "border-t animate-in slide-in-from-top-2 duration-200",
                "bg-[#353839]/40",
                "data-[theme=light]:bg-[#F5F3FF]/40",
                "border-[#555D50]/30",
                "data-[theme=light]:border-[#CED9EF]/30"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
        >
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#7A27FF]" />
                        <span className={cn(
                            "text-sm font-bold",
                            "text-[#E2DFD2] data-[theme=light]:text-[#2E293A]"
                        )} data-theme={isLightMode ? 'light' : 'dark'}>
                            Analytics for <code className="text-[#60A5FA] bg-[#60A5FA]/10 px-1.5 py-0.5 rounded text-xs">{linkSlug}</code>
                        </span>
                    </div>
                    <button
                        onClick={onCollapse}
                        className={cn(
                            "p-1.5 rounded-lg transition-all",
                            "text-[#9E9E9E] hover:text-[#E2DFD2] hover:bg-[#5B4965]/30",
                            "data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#2E293A] data-[theme=light]:hover:bg-[#EFC8DF]/30"
                        )}
                        data-theme={isLightMode ? 'light' : 'dark'}
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>
                </div>

                {/* Period bar */}
                <div className="flex flex-wrap items-center gap-2">
                    {PERIODS.map(p => (
                        <button
                            key={p.value}
                            onClick={() => handlePeriodChange(p.value)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                activePeriod === p.value
                                    ? "bg-[#7A27FF]/20 text-[#C4A0FF] border border-[#7A27FF]/40 data-[theme=light]:bg-[#7A27FF]/10 data-[theme=light]:text-[#7A27FF]"
                                    : "bg-[#3C3F40]/60 text-[#9E9E9E] border border-[#555D50]/40 hover:text-[#E2DFD2] data-[theme=light]:bg-white/60 data-[theme=light]:text-[#6B6B7B] data-[theme=light]:border-[#CED9EF]/40"
                            )}
                            data-theme={isLightMode ? 'light' : 'dark'}
                        >
                            {p.label}
                        </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-2">
                        <DatePicker
                            value={startDate}
                            onChange={handleStartDateChange}
                            placeholder="Start"
                            max={endDate}
                            className="!text-xs !py-1 !px-2 !min-w-[110px]"
                        />
                        <span className={cn(
                            "text-[10px]",
                            "text-[#9E9E9E] data-[theme=light]:text-[#6B6B7B]"
                        )} data-theme={isLightMode ? 'light' : 'dark'}>to</span>
                        <DatePicker
                            value={endDate}
                            onChange={handleEndDateChange}
                            placeholder="End"
                            min={startDate}
                            className="!text-xs !py-1 !px-2 !min-w-[110px]"
                        />
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-[#7A27FF]" />
                    </div>
                ) : error ? (
                    <div className="text-center py-6 text-red-400 text-sm">{error}</div>
                ) : (
                    <>
                        {/* Summary cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Total Clicks', value: summary?.totalClicks ?? 0, color: '#00FF85' },
                                { label: 'Total Views', value: summary?.totalViews ?? 0, color: '#7A27FF' },
                                { label: 'Avg / Day', value: summary?.avgClicksPerDay ?? 0, color: '#D4AF37' },
                            ].map(stat => (
                                <div
                                    key={stat.label}
                                    className={cn(
                                        "rounded-xl p-3 text-center",
                                        "bg-[#3C3F40]/50 border border-[#555D50]/30",
                                        "data-[theme=light]:bg-white/50 data-[theme=light]:border-[#CED9EF]/30"
                                    )}
                                    data-theme={isLightMode ? 'light' : 'dark'}
                                >
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-wider mb-1",
                                        "text-[#9E9E9E] data-[theme=light]:text-[#6B6B7B]"
                                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                                        {stat.label}
                                    </p>
                                    <p className="text-lg font-bold tabular-nums" style={{ color: stat.color }}>
                                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Chart */}
                        {chartData.length > 0 ? (
                            <div className={cn(
                                "rounded-xl p-3",
                                "bg-[#3C3F40]/30 border border-[#555D50]/20",
                                "data-[theme=light]:bg-white/30 data-[theme=light]:border-[#CED9EF]/20"
                            )} data-theme={isLightMode ? 'light' : 'dark'}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id={`clickGrad-${linkId}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00FF85" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#00FF85" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id={`viewGrad-${linkId}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#7A27FF" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#7A27FF" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={isLightMode ? '#CED9EF' : '#555D50'}
                                            strokeOpacity={0.2}
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="label"
                                            stroke={isLightMode ? '#CED9EF' : '#555D50'}
                                            tick={{ fill: isLightMode ? '#6B6B7B' : '#9E9E9E', fontSize: 10 }}
                                            tickLine={false}
                                            axisLine={{ stroke: isLightMode ? '#CED9EF' : '#555D50' }}
                                            tickMargin={8}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            stroke={isLightMode ? '#CED9EF' : '#555D50'}
                                            tick={{ fill: isLightMode ? '#6B6B7B' : '#9E9E9E', fontSize: 10 }}
                                            tickLine={false}
                                            axisLine={{ stroke: isLightMode ? '#CED9EF' : '#555D50' }}
                                            tickMargin={8}
                                            tickFormatter={(v) => {
                                                if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
                                                return v.toString();
                                            }}
                                        />
                                        <Tooltip content={<CustomTooltip isLightMode={isLightMode} />} />
                                        <Area
                                            type="monotone"
                                            dataKey="views"
                                            stroke="#7A27FF"
                                            strokeWidth={2}
                                            fill={`url(#viewGrad-${linkId})`}
                                            dot={false}
                                            activeDot={{ r: 4, fill: '#7A27FF', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="clicks"
                                            stroke="#00FF85"
                                            strokeWidth={2}
                                            fill={`url(#clickGrad-${linkId})`}
                                            dot={false}
                                            activeDot={{ r: 4, fill: '#00FF85', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                                {/* Legend */}
                                <div className="flex items-center justify-center gap-4 mt-2">
                                    <span className="flex items-center gap-1.5 text-[10px] text-[#9E9E9E]">
                                        <span className="w-3 h-0.5 rounded bg-[#7A27FF]" />
                                        Views
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[10px] text-[#9E9E9E]">
                                        <span className="w-3 h-0.5 rounded bg-[#00FF85]" />
                                        Clicks
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-[#9E9E9E]/30" />
                                <p className="text-[#9E9E9E]/60 text-xs">No data for this date range</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
