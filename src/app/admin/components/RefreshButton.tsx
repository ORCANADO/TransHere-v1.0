'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RefreshStatus } from '@/types/analytics-aggregated';

interface RefreshButtonProps {
    adminKey: string;
    onRefreshComplete?: () => void;
    className?: string;
}

export function RefreshButton({
    adminKey,
    onRefreshComplete,
    className
}: RefreshButtonProps) {
    const [status, setStatus] = useState<RefreshStatus | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch current refresh status
    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(`/api/admin/refresh-views?key=${adminKey}`);
            const result = await response.json();

            if (result.success) {
                setStatus(result.data);
            }
        } catch (err) {
            console.error('Error fetching refresh status:', err);
        }
    }, [adminKey]);

    // Initial fetch
    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Trigger refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/refresh-views?key=${adminKey}`, {
                method: 'POST',
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to refresh');
            }

            setStatus(result.data);
            onRefreshComplete?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Refresh failed');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Calculate time since last refresh
    const getTimeSinceRefresh = (): string => {
        if (!status?.timestamp) return 'Never';

        const lastRefresh = new Date(status.timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastRefresh.getTime()) / 60000);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
        return `${Math.floor(diffMinutes / 1440)}d ago`;
    };

    // Determine if refresh is recommended
    const isStale = (): boolean => {
        if (!status?.timestamp) return true;
        const lastRefresh = new Date(status.timestamp);
        const diffMinutes = (Date.now() - lastRefresh.getTime()) / 60000;
        return diffMinutes > 60; // More than 1 hour old
    };

    return (
        <div className={cn("flex items-center gap-3", className)}>
            {/* Refresh Button */}
            <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl",
                    "font-medium text-sm transition-all duration-200",
                    isRefreshing
                        ? "bg-[#00FF85]/20 text-[#00FF85] cursor-wait"
                        : isStale()
                            ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30"
                            : "bg-white/10 text-white/80 hover:bg-white/20",
                    "disabled:opacity-50"
                )}
            >
                <RefreshCw
                    className={cn(
                        "w-4 h-4",
                        isRefreshing && "animate-spin"
                    )}
                />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
                {status?.status === 'success' && (
                    <>
                        <Check className="w-4 h-4 text-[#00FF85]" />
                        <span className="text-white/60">
                            Updated {getTimeSinceRefresh()}
                        </span>
                    </>
                )}

                {status?.status === 'error' && (
                    <>
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">
                            Error: {status.error_message || 'Unknown error'}
                        </span>
                    </>
                )}

                {status?.status === 'never' && (
                    <>
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400">
                            Never refreshed
                        </span>
                    </>
                )}

                {status?.status === 'in_progress' && (
                    <>
                        <RefreshCw className="w-4 h-4 text-[#00FF85] animate-spin" />
                        <span className="text-[#00FF85]">
                            Refresh in progress...
                        </span>
                    </>
                )}
            </div>

            {/* Duration badge */}
            {status?.duration_ms && status.status === 'success' && (
                <span className="px-2 py-1 rounded-md bg-white/5 text-xs text-white/40">
                    {status.duration_ms}ms
                </span>
            )}

            {/* Error Message */}
            {error && (
                <span className="text-red-400 text-sm">
                    {error}
                </span>
            )}
        </div>
    );
}

export default RefreshButton;
