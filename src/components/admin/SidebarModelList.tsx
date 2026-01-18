'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Search, Link2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/utils';
import type { Model } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarModelListProps {
    models: Model[];
    selectedIds: string[];
    onModelToggle: (modelId: string) => void;
    onClearSelection: () => void;
    onEditModel: (model: Model) => void;
    onManageTrackingLinks: (model: Model) => void;
    isLoading?: boolean;
    metrics?: Record<string, { views: number; clicks: number }>;
}

export function SidebarModelList({
    models,
    selectedIds,
    onModelToggle,
    onClearSelection,
    onEditModel,
    onManageTrackingLinks,
    isLoading = false,
    metrics,
}: SidebarModelListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);

    // Update pinned list when selection changes (keep last 3 - FIFO)
    useEffect(() => {
        const newPinned = selectedIds.slice(-3);
        setPinnedIds(newPinned);
    }, [selectedIds]);

    // Handle shortcuts: focus search when Cmd/Ctrl + K is pressed
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('model-search-input')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Filter models based on search query
    const filteredModels = useMemo(() => {
        if (!searchQuery.trim()) return models;
        const query = searchQuery.toLowerCase();
        return models.filter((model) =>
            model.name.toLowerCase().includes(query) ||
            model.slug.toLowerCase().includes(query)
        );
    }, [models, searchQuery]);

    // Sort models: pinned first, then unpinned
    const sortedModels = useMemo(() => {
        const pinned = filteredModels.filter((m) => pinnedIds.includes(m.id));
        const unpinned = filteredModels.filter((m) => !pinnedIds.includes(m.id));
        return [...pinned, ...unpinned];
    }, [filteredModels, pinnedIds]);

    // Handle checkbox toggle
    const handleSelect = (modelId: string, checked: boolean | 'indeterminate') => {
        onModelToggle(modelId);
    };

    // Loading State
    if (isLoading && models.length === 0) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-3 border-b border-white/10">
                    <div className="h-9 bg-white/5 rounded-lg animate-pulse" />
                </div>
                <div className="flex-1 px-2 py-4 space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Empty state: No models at all
    if (models.length === 0 && !isLoading) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-black/[0.03] dark:bg-white/5 flex items-center justify-center mb-4">
                        <Link2 className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">No models yet</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-[200px] font-medium leading-relaxed">
                        Get started by adding your first model in the settings below.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar - Sticky */}
            <div className="sticky top-0 z-10 p-3 bg-white/80 dark:bg-[#0A1221]/80 backdrop-blur-xl border-b border-border dark:border-white/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        id="model-search-input"
                        type="text"
                        placeholder="Search models... (⌘K)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                            "w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-medium",
                            "bg-black/[0.03] dark:bg-white/5",
                            "border border-border dark:border-white/10",
                            "focus:ring-2 focus:ring-[#007AFF]/20 focus:bg-white dark:focus:bg-white/10",
                            "placeholder:text-muted-foreground",
                            "text-foreground",
                            "transition-all outline-none"
                        )}
                    />
                </div>
            </div>

            {/* Model List - Scrollable */}
            <div
                className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
                {sortedModels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <p className="text-sm text-muted-foreground">No models match your search</p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="text-xs text-[#007AFF] mt-2 hover:underline"
                        >
                            Clear search
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sortedModels.map((model) => {
                            const isSelected = selectedIds.includes(model.id);
                            const isPinned = pinnedIds.includes(model.id);

                            return (
                                <div
                                    key={model.id}
                                    onClick={() => handleSelect(model.id, !isSelected)}
                                    className={cn(
                                        "group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all",
                                        isSelected
                                            ? "bg-[#007AFF]/10 dark:bg-[#AF52DE]/10 border border-[#007AFF]/30 dark:border-[#AF52DE]/30 shadow-sm"
                                            : "hover:bg-black/[0.03] dark:hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    {/* Profile Photo (clickable for edit) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditModel(model);
                                        }}
                                        className={cn(
                                            "relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 z-10",
                                            "ring-2 ring-[#E5E5EA] dark:ring-white/20",
                                            "group-hover:ring-[#007AFF] dark:group-hover:ring-[#007AFF] transition-all",
                                            "shadow-sm"
                                        )}
                                        title={`Edit ${model.name}`}
                                    >
                                        {model.image_url ? (
                                            <Image
                                                src={getImageUrl(model.image_url)}
                                                alt={model.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#007AFF]/20 to-[#AF52DE]/20 text-xs font-semibold text-[#007AFF]">
                                                {model.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </button>

                                    {/* Model Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "font-semibold text-[12px] leading-tight transition-colors flex flex-col uppercase tracking-tight",
                                                isSelected
                                                    ? "text-[#007AFF] dark:text-[#AF52DE]"
                                                    : "text-[#1D1D1F] dark:text-gray-200"
                                            )}>
                                                {model.slug.split('-').map((part, i) => (
                                                    <span key={i} className={cn("block", i > 0 && "opacity-70 text-[10px]")}>
                                                        {part}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Tracking Link Button - Moved next to name */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onManageTrackingLinks(model);
                                                }}
                                                className={cn(
                                                    "opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all",
                                                    "hover:bg-[#E8E8ED] dark:hover:bg-white/10",
                                                    "text-[#86868B] dark:text-gray-400 hover:text-[#007AFF] dark:hover:text-[#007AFF]",
                                                    "active:scale-95"
                                                )}
                                                title="Manage tracking links"
                                            >
                                                <Link2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                    </div>

                                    {/* Metrics (Views/Clicks) */}
                                    <div className="flex flex-col items-end gap-0.5 text-[10px] sm:text-xs">
                                        <div className="flex items-center gap-1.5 font-medium text-[#007AFF] dark:text-[#007AFF]">
                                            <span className="tabular-nums">{metrics?.[model.slug]?.views?.toLocaleString() || 0}</span>
                                            <span className="text-[9px] opacity-60 uppercase tracking-wider font-medium">Views</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 font-medium text-[#AF52DE] dark:text-[#AF52DE]">
                                            <span className="tabular-nums">{metrics?.[model.slug]?.clicks?.toLocaleString() || 0}</span>
                                            <span className="text-[9px] opacity-60 uppercase tracking-wider font-medium">Clicks</span>
                                        </div>
                                    </div>

                                    {/* Visual Selection Indicator (Green glow/border handled by parent div class) */}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selection Summary */}
            {selectedIds.length > 0 && (
                <div className="sticky bottom-0 p-3 bg-white/80 dark:bg-[#0A1221]/80 backdrop-blur-xl border-t border-border dark:border-white/10">
                    <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-muted-foreground font-bold uppercase tracking-wider">
                            {selectedIds.length} model{selectedIds.length !== 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={onClearSelection}
                            className="text-[#007AFF] hover:text-[#007AFF]/80 transition-colors font-medium"
                        >
                            Clear all
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
