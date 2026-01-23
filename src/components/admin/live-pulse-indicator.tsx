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
            {/* Pulsing Dot */}
            <div className="relative">
                <div
                    className={cn(
                        'h-2.5 w-2.5 rounded-full transition-colors duration-300',
                        isLive ? 'bg-emerald-500' : 'bg-gray-400'
                    )}
                />
                {isLive && (
                    <div className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500 opacity-75" />
                )}
            </div>

            {/* Label */}
            <span className={cn(
                'text-xs font-medium transition-colors',
                isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
            )}>
                {isLoading ? 'Checking...' : isLive ? `${recentCount} live` : 'Quiet'}
            </span>
        </div>
    );
}
