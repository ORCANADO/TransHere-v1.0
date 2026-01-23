'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { Shield, RefreshCw, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import '@/app/admin/admin-theme.css'; // Ensure theme styles are loaded

interface AnalyticsEvent {
    created_at: string;
    event_type: 'page_view' | 'link_click' | 'story_view' | 'bridge_view' | 'conversion';
    model_slug: string | null;
    country: string | null;
    city: string | null;
    user_agent: string | null;
    referrer: string | null;
}

interface LivePulseViewProps {
    initialEvents: AnalyticsEvent[];
    adminKey: string;
}

export function LivePulseView({ initialEvents, adminKey }: LivePulseViewProps) {
    const router = useRouter();
    const { isDarkMode } = useAdminTheme();
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [timeSinceRefresh, setTimeSinceRefresh] = useState<number>(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const intervalId = setInterval(() => {
            setIsRefreshing(true);
            router.refresh();
            setLastRefreshed(new Date());
            setIsRefreshing(false);
        }, 10000);

        return () => clearInterval(intervalId);
    }, [router]);

    // Update "X seconds ago" counter every second
    useEffect(() => {
        const timerId = setInterval(() => {
            const now = new Date();
            const diff = Math.floor((now.getTime() - lastRefreshed.getTime()) / 1000);
            setTimeSinceRefresh(diff);
        }, 1000);

        return () => clearInterval(timerId);
    }, [lastRefreshed]);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-[#00FF85]" />
                        <span className="font-bold text-lg">Live Pulse Diagnostic</span>
                        <span className="px-2 py-1 bg-[#FF0055]/20 text-[#FF0055] text-xs rounded-full flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            Real-time
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            {isRefreshing ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-[#007AFF]" />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse" />
                            )}
                            <span>
                                Updated {timeSinceRefresh}s ago
                            </span>
                        </div>
                        <div className="font-mono text-xs opacity-50">
                            {initialEvents.length} events
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                <tr>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Event</th>
                                    <th className="px-4 py-3">Model</th>
                                    <th className="px-4 py-3">Location</th>
                                    <th className="px-4 py-3">Referrer</th>
                                    <th className="px-4 py-3">User Agent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {initialEvents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Activity className="w-8 h-8 opacity-20" />
                                                <p>No events in the last 15 minutes.</p>
                                                <p className="text-xs opacity-60">Visit a bridge page or trigger an event to see it here.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    initialEvents.map((event, i) => (
                                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                                                {new Date(event.created_at).toLocaleTimeString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                    event.event_type === 'page_view' ? "bg-blue-500/10 text-blue-500" :
                                                        event.event_type === 'link_click' ? "bg-green-500/10 text-green-500" :
                                                            event.event_type === 'bridge_view' ? "bg-purple-500/10 text-purple-500" :
                                                                event.event_type === 'story_view' ? "bg-orange-500/10 text-orange-500" :
                                                                    "bg-gray-500/10 text-gray-500"
                                                )}>
                                                    {event.event_type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {event.model_slug || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {event.city && event.country
                                                    ? `${event.city}, ${event.country}`
                                                    : event.country || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]" title={event.referrer || ''}>
                                                {event.referrer ? new URL(event.referrer).hostname : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground opacity-70 truncate max-w-[200px]" title={event.user_agent || ''}>
                                                {event.user_agent || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
