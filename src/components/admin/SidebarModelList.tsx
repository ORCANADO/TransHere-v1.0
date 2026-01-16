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
    onSelectionChange: (ids: string[]) => void;
    onEditModel: (model: Model) => void;
    onManageTrackingLinks: (model: Model) => void;
    isLoading?: boolean;
}

export function SidebarModelList({
    models,
    selectedIds,
    onSelectionChange,
    onEditModel,
    onManageTrackingLinks,
    isLoading = false,
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
        if (checked === true) {
            onSelectionChange([...selectedIds, modelId]);
        } else {
            onSelectionChange(selectedIds.filter((id) => id !== modelId));
        }
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
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Link2 className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">No models yet</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
                        Get started by adding your first model in the settings below.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar - Sticky */}
            <div className="sticky top-0 z-10 p-3 bg-white/60 dark:bg-[#0A1221]/60 backdrop-blur-xl border-b border-white/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        id="model-search-input"
                        type="text"
                        placeholder="Search models... (⌘K)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                            "w-full pl-9 pr-3 py-2 rounded-lg text-sm",
                            "bg-white/60 dark:bg-white/5",
                            "border border-white/20 dark:border-white/10",
                            "focus-ring",
                            "placeholder:text-muted-foreground",
                            "transition-all"
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
                            className="text-xs text-[#7A27FF] mt-2 hover:underline"
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
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-lg transition-all scale-up-subtle",
                                        isPinned
                                            ? "bg-[#00FF85]/10 dark:bg-[#00FF85]/5 border border-[#00FF85]/20"
                                            : "hover:bg-white/10 border border-transparent"
                                    )}
                                >
                                    {/* Profile Photo (clickable for edit) */}
                                    <button
                                        onClick={() => onEditModel(model)}
                                        className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 group"
                                        title={`Edit ${model.name}`}
                                    >
                                        {model.image_url ? (
                                            <Image
                                                src={getImageUrl(model.image_url)}
                                                alt={model.name}
                                                fill
                                                className="object-cover border border-white/20 rounded-full group-hover:border-[#7A27FF]/50 transition-colors"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#7A27FF]/20 to-[#00FF85]/20 border border-white/20 rounded-full text-xs font-semibold text-[#7A27FF] group-hover:border-[#7A27FF]/50 transition-colors">
                                                {model.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </button>

                                    {/* Model Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate flex items-center gap-1">
                                            {model.name}
                                            {model.is_verified && (
                                                <span className="text-[#7A27FF]">✓</span>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-mono">/{model.slug}</span>
                                        </div>
                                    </div>

                                    {/* Tracking Link Button */}
                                    <button
                                        onClick={() => onManageTrackingLinks(model)}
                                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-[#7A27FF]"
                                        title="Manage tracking links"
                                    >
                                        <Link2 className="w-4 h-4" />
                                    </button>

                                    {/* Selection Checkbox */}
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => handleSelect(model.id, checked)}
                                        className={cn(
                                            "border-white/30 data-[state=checked]:bg-[#7A27FF] data-[state=checked]:border-[#7A27FF]",
                                            "transition-all"
                                        )}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selection Summary */}
            {selectedIds.length > 0 && (
                <div className="sticky bottom-0 p-3 bg-white/60 dark:bg-[#0A1221]/60 backdrop-blur-xl border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                            {selectedIds.length} model{selectedIds.length !== 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={() => onSelectionChange([])}
                            className="text-[#7A27FF] hover:text-[#7A27FF]/80 transition-colors font-medium"
                        >
                            Clear all
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
