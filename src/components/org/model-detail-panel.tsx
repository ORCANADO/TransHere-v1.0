'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    X, Eye, MousePointer, TrendingUp, Globe,
    Calendar, Shield, ArrowUpRight, ChevronRight, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/utils';
import { ComparisonChart } from '@/components/admin/comparison-chart';
import { StatCard } from '@/components/admin/stat-card';
import type { ComparisonDataPoint } from '@/types/charts';

interface ModelDetailPanelProps {
    isOpen: boolean;
    onClose: () => void;
    model: {
        id: string;
        name: string;
        slug: string;
        image_url: string;
        is_verified?: boolean;
    } | null;
    stats: {
        totalViews: number;
        totalClicks: number;
        ctr: number;
        countryBreakdown: Array<{ country: string; views: number; clicks: number }>;
        chartData: Array<{ date: string; label?: string; views: number; clicks: number; visitsPrev?: number; clicksPrev?: number }>;
    } | null;
    loading?: boolean;
    onManageTrackingLinks?: () => void;
}

/**
 * Model Detail Panel (Custom Slide-out Sheet)
 * 
 * Provides a deep-dive view into a single model's performance.
 * Features:
 * - Stunning glassmorphism header with model profile
 * - Overview stats with visual indicators
 * - Time-series performance chart
 * - Geographic reach breakdown
 */
export function ModelDetailPanel({
    isOpen,
    onClose,
    model,
    stats,
    loading = false,
    onManageTrackingLinks,
}: ModelDetailPanelProps) {
    const [activeMetric, setActiveMetric] = useState<'views' | 'clicks'>('views');

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [isOpen]);

    // Map chart data for the model
    const chartData = useMemo((): ComparisonDataPoint[] => {
        if (!stats?.chartData) return [];
        return stats.chartData.map(d => ({
            date: d.date,
            label: d.label || new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            current: activeMetric === 'views' ? d.views : d.clicks,
            previous: activeMetric === 'views' ? (d.visitsPrev || 0) : (d.clicksPrev || 0),
        }));
    }, [stats, activeMetric]);

    if (!model && !loading) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[100] transition-opacity duration-300",
                isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0A1221]/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={cn(
                    "absolute right-0 top-0 h-full w-full max-w-2xl bg-[#F9F9FB] dark:bg-[#0A1221] border-l border-white/10 shadow-2xl transition-transform duration-500 ease-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header Profile Section */}
                <div className="relative h-64 overflow-hidden border-b border-white/10">
                    {/* Background Blur Image */}
                    {model?.image_url && (
                        <div
                            className="absolute inset-0 scale-110 blur-2xl opacity-30 grayscale saturate-150"
                            style={{
                                backgroundImage: `url(${getImageUrl(model.image_url)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        />
                    )}

                    {/* Top Controls */}
                    <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border border-white/10 transition-all active:scale-95"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-[#00FF85]" />
                            Now Monitoring
                        </div>
                    </div>

                    {/* Profile Banner */}
                    <div className="absolute bottom-6 left-6 right-6 z-10 flex items-end gap-6">
                        <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl group transition-transform duration-500 hover:scale-[1.05]">
                            {model?.image_url && (
                                <img
                                    src={getImageUrl(model.image_url)}
                                    alt={model.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            )}
                            <div className="absolute top-2 right-2 w-3 h-3 bg-[#00FF85] rounded-full border-2 border-background animate-pulse" />
                        </div>
                        <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none">
                                    {model?.name}
                                </h2>
                                {model?.is_verified && (
                                    <div className="p-1 bg-[#007AFF]/10 rounded-lg border border-[#007AFF]/20">
                                        <Shield className="w-4 h-4 text-[#007AFF]" />
                                    </div>
                                )}
                            </div>
                            <p className="text-white/60 font-mono text-sm tracking-widest uppercase">
                                /{model?.slug}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Area - Scrollable */}
                <div className="overflow-y-auto h-[calc(100vh-256px)] p-6 space-y-8 custom-scrollbar">
                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="grid grid-cols-3 gap-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-24 bg-white/5 rounded-2xl" />
                                ))}
                            </div>
                            <div className="h-64 bg-white/5 rounded-2xl" />
                        </div>
                    ) : stats ? (
                        <>
                            {/* Performance Overview */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:border-[#007AFF]/30 transition-all">
                                    <div className="flex items-center gap-2 text-[#007AFF] mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <Eye className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Total Views</span>
                                    </div>
                                    <p className="text-3xl font-black text-white">{stats.totalViews.toLocaleString()}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:border-[#AF52DE]/30 transition-all">
                                    <div className="flex items-center gap-2 text-[#AF52DE] mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <MousePointer className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Total Clicks</span>
                                    </div>
                                    <p className="text-3xl font-black text-white">{stats.totalClicks.toLocaleString()}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:border-[#D4AF37]/30 transition-all">
                                    <div className="flex items-center gap-2 text-[#D4AF37] mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Conv. Rate</span>
                                    </div>
                                    <p className="text-3xl font-black text-white">{stats.ctr.toFixed(2)}%</p>
                                </div>
                            </div>

                            {/* Detailed Chart */}
                            <div className="glass-panel rounded-2xl p-6 border border-white/10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-muted-foreground" />
                                        <h3 className="font-bold text-white">Execution Over Time</h3>
                                    </div>
                                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                                        <button
                                            onClick={() => setActiveMetric('views')}
                                            className={cn(
                                                "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                                activeMetric === 'views' ? "bg-[#007AFF] text-white shadow-lg" : "text-muted-foreground"
                                            )}
                                        >
                                            Views
                                        </button>
                                        <button
                                            onClick={() => setActiveMetric('clicks')}
                                            className={cn(
                                                "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                                activeMetric === 'clicks' ? "bg-[#AF52DE] text-white shadow-lg" : "text-muted-foreground"
                                            )}
                                        >
                                            Clicks
                                        </button>
                                    </div>
                                </div>
                                <ComparisonChart
                                    data={chartData}
                                    height={280}
                                    className="p-0 border-none"
                                />
                            </div>

                            {/* Geographic Distribution */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <Globe className="w-5 h-5 text-[#00FF85]" />
                                    <h3 className="font-bold text-white uppercase tracking-tighter text-lg">Top Regional Reach</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {stats.countryBreakdown.slice(0, 6).map((c, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-white/40">
                                                    {i + 1}
                                                </div>
                                                <span className="font-bold text-white">{c.country}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-[#007AFF]">{(c.views).toLocaleString()}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase">Views</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
                                <a
                                    href={`/model/${model?.slug}`}
                                    target="_blank"
                                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-black font-black uppercase tracking-widest hover:bg-[#00FF85] transition-colors"
                                >
                                    View Public Profile
                                    <ArrowUpRight className="w-4 h-4" />
                                </a>
                                {onManageTrackingLinks && (
                                    <button
                                        onClick={onManageTrackingLinks}
                                        className="sm:w-20 flex items-center justify-center py-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-[#7A27FF]/20 hover:border-[#7A27FF]/30 transition-all"
                                        title="Manage Tracking Links"
                                    >
                                        <Link2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20 grayscale opacity-30">
                            <Shield className="w-20 h-20 mx-auto mb-4" />
                            <p className="font-bold uppercase tracking-widest text-white">Secure Data Vault</p>
                            <p className="text-sm">Select a model to initialize analysis</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
