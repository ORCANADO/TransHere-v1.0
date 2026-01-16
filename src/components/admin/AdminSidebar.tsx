'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';

import { SidebarSettings } from './SidebarSettings';
import { SidebarModelList } from './SidebarModelList';
import type { Model } from '@/types';

interface AdminSidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    models: { id: string; name: string; slug: string; image_url?: string }[];
    selectedModelIds: string[];
    onModelSelect: (modelId: string) => void;
    onAddModel: () => void;
    onSettingsClick?: () => void;
    isLoading?: boolean;
}

export function AdminSidebar({
    isCollapsed,
    onToggleCollapse,
    models,
    selectedModelIds,
    onModelSelect,
    onAddModel,
    onSettingsClick,
    isLoading = false,
}: AdminSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // ... (rest of memo stays)

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity lg:hidden",
                    isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                )}
                onClick={onToggleCollapse}
            />

            <aside className={cn(
                "h-screen bg-white/80 dark:bg-[#0A1221]/80 backdrop-blur-xl border-r border-white/20 dark:border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col overflow-hidden z-50",
                "fixed lg:relative", // Overlay on mobile, relative on desktop
                isCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-0" : "translate-x-0 w-[280px]"
            )}>
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7A27FF] to-[#00FF85] flex items-center justify-center">
                            <span className="text-white font-bold text-sm">TH</span>
                        </div>
                        <span className="font-semibold text-sm">TransHere</span>
                    </div>
                    <button
                        onClick={onToggleCollapse}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        aria-label="Toggle sidebar"
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </header>

                {/* Model List Container */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <SidebarModelList
                        models={models as Model[]}
                        selectedIds={selectedModelIds}
                        onSelectionChange={(ids: string[]) => {
                            // For sidebar select, we might want to just toggle individual
                            // But SidebarModelList handles the logic. 
                            // We need to map it back to onModelSelect
                            // Actually, SidebarModelList is designed for the FULL list management.
                            // Let's ensure it works with the toggleModel logic
                            const added = ids.find(id => !selectedModelIds.includes(id));
                            const removed = selectedModelIds.find(id => !ids.includes(id));
                            if (added) onModelSelect(added);
                            else if (removed) onModelSelect(removed);
                        }}
                        onEditModel={(model: Model) => {
                            // Trigger edit from parent
                            (window as any).dispatchEvent(new CustomEvent('edit-model', { detail: model }));
                        }}
                        onManageTrackingLinks={(model: Model) => {
                            (window as any).dispatchEvent(new CustomEvent('manage-tracking', { detail: model }));
                        }}
                        isLoading={isLoading}
                    />
                </div>

                {/* Settings Footer */}
                <SidebarSettings onAddModel={onAddModel} />
            </aside>
        </>
    );
}
