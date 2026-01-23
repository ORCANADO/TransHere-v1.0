'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LivePulseIndicatorProps {
    adminKey: string;
    className?: string;
}

export function LivePulseIndicator({ adminKey, className }: LivePulseIndicatorProps) {
    const [recentCount, setRecentCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [lastChecked, setLastChecked] = useState<Date>(new Date());

    useEffect(() => {
        const fetchRecentEvents = async () => {
            try {
                // Query for events in the last 60 seconds
                const response = await fetch(
                    `/api/admin/live-pulse?key=${adminKey}&seconds=60`
                );
                if (response.ok) {
                    const data = await response.json();
                    setRecentCount(data.count);
                }
            } catch (error) {
                console.error('[LivePulse] Fetch error:', error);
            } finally {
                setIsLoading(false);
                setLastChecked(new Date());
            }
        };

        // Initial fetch
        fetchRecentEvents();

        // Poll every 10 seconds
        const interval = setInterval(fetchRecentEvents, 10000);
        return () => clearInterval(interval);
    }, [adminKey]);

    const isLive = recentCount !== null && recentCount > 0;

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Live Indicator Dot */}
            <span className="relative flex h-2.5 w-2.5">
                {isLive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF85] opacity-75"></span>
                )}
                <span className={cn(
                    "relative inline-flex rounded-full h-2.5 w-2.5 transition-colors duration-300",
                    isLive ? "bg-[#00FF85]" : "bg-[#9E9E9E]/40"
                )}></span>
            </span>

            <span className={cn(
                "text-sm font-medium",
                isLive ? "text-[#00FF85]" : "text-[#9E9E9E]"
            )}>
                {isLoading ? '...' : isLive ? `${recentCount} live` : 'Quiet'}
            </span>
        </div>
    );
}
