'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Search, Link2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useMaterialFlux } from '@/hooks/use-material-flux';
import { getImageUrl } from '@/lib/utils';
import type { Model } from '@/types';
import { useAdminTheme } from '@/hooks/use-admin-theme';
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
    const { isLightMode } = useAdminTheme();

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
            <div className="px-3 py-3" data-theme={isLightMode ? 'light' : 'dark'}>
                <div className="relative">
                    <Search className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                        "text-[#9E9E9E]",
                        "data-[theme=light]:text-[#6B6B7B]"
                    )} data-theme={isLightMode ? 'light' : 'dark'} />
                    <input
                        id="model-search-input"
                        type="text"
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                            "w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none",
                            "backdrop-blur-[8px]",

                            // Dark Mode
                            "bg-[#353839]/60",
                            "border border-[#555D50]",
                            "text-[#E2DFD2]",
                            "placeholder:text-[#9E9E9E]",

                            // Light Mode
                            "data-[theme=light]:bg-white/60",
                            "data-[theme=light]:border-[#CED9EF]/60",
                            "data-[theme=light]:text-[#2E293A]",
                            "data-[theme=light]:placeholder:text-[#6B6B7B]",

                            // Focus
                            "focus:outline-none focus:ring-2 focus:ring-[#7A27FF]/30",
                            "focus:border-[#7A27FF]"
                        )}
                        data-theme={isLightMode ? 'light' : 'dark'}
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
                            className="text-xs text-accent-violet mt-2 hover:underline font-bold"
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
                                <ModelListItem
                                    key={model.id}
                                    model={model}
                                    isSelected={isSelected}
                                    onSelect={() => handleSelect(model.id, !isSelected)}
                                    onEdit={onEditModel}
                                    onManageTracking={onManageTrackingLinks}
                                    metrics={metrics?.[model.slug]}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selection Summary */}
            {selectedIds.length > 0 && (
                <div className={cn(
                    "sticky bottom-0 p-3 border-t",
                    "bg-[#0B0C0C]/90",
                    "backdrop-blur-[40px] saturate-[180%]",
                    "border-[#555D50]/50",
                    "data-[theme=light]:bg-white/90",
                    "data-[theme=light]:border-[#CED9EF]/50"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                    <div className="flex items-center justify-between text-xs px-1">
                        <span className={cn(
                            "text-[#9E9E9E]",
                            "data-[theme=light]:text-[#6B6B7B]",
                            "font-bold uppercase tracking-wider"
                        )} data-theme={isLightMode ? 'light' : 'dark'}>
                            {selectedIds.length} model{selectedIds.length !== 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={onClearSelection}
                            className="text-[#00FF85] hover:opacity-80 transition-opacity font-bold active:scale-90"
                        >
                            Clear all
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
interface ModelListItemProps {
    model: Model;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: (model: Model) => void;
    onManageTracking: (model: Model) => void;
    metrics?: { views: number; clicks: number };
}

function ModelListItem({ model, isSelected, onSelect, onEdit, onManageTracking, metrics }: ModelListItemProps) {
    const { isLightMode } = useAdminTheme();

    return (
        <div
            onClick={onSelect}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group cursor-pointer",

                // Dark Mode
                "hover:bg-[#5B4965]/20",
                isSelected && "bg-[#5B4965]/40 border-l-3 border-[#00FF85]",

                // Light Mode
                "data-[theme=light]:hover:bg-[#EFC8DF]/15",
                isSelected && "data-[theme=light]:bg-[#CED9EF]/30"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
        >
            {/* Avatar - Clicking this triggers the editor specifically */}
            <div
                className={cn(
                    "w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0 relative transition-all duration-200",
                    "border-[#555D50]/50 hover:border-[#7A27FF] hover:scale-105 active:scale-95 cursor-pointer",
                    "data-[theme=light]:border-[#CED9EF]/80 data-[theme=light]:hover:border-[#7A27FF]"
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(model);
                }}
                title={`Edit ${model.name}`}
                data-theme={isLightMode ? 'light' : 'dark'}
            >
                {model.image_url ? (
                    <Image
                        src={getImageUrl(model.image_url)}
                        alt={model.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#7A27FF]/20 to-[#00FF85]/20 text-xs font-bold text-[#7A27FF]">
                        {model.name.substring(0, 2).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 text-left min-w-0">
                <p className={cn(
                    "font-medium text-sm truncate",
                    "text-[#E2DFD2]",
                    "data-[theme=light]:text-[#2E293A]"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                    {model.name}
                </p>
                <p className={cn(
                    "text-xs truncate",
                    "text-[#9E9E9E]",
                    "data-[theme=light]:text-[#6B6B7B]"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                    {(metrics?.views || 0).toLocaleString()} views • {metrics?.clicks || 0} clicks
                </p>
            </div>

            {/* Tracking Link Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onManageTracking(model);
                }}
                className={cn(
                    "p-2 rounded-lg transition-all",
                    "opacity-40 group-hover:opacity-100",
                    "hover:bg-[#5B4965]/20",
                    "text-[#9E9E9E] hover:text-[#00FF85]",
                    "data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#7A27FF]",
                    "active:scale-95"
                )}
                title="Manage tracking links"
                data-theme={isLightMode ? 'light' : 'dark'}
            >
                <Link2 className="w-4 h-4" />
            </button>
        </div>
    );
}
