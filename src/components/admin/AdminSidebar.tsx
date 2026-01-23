'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaterialFlux } from '@/hooks/use-material-flux';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';

import { useAdminTheme } from '@/hooks/use-admin-theme';
import { SidebarSettings } from './SidebarSettings';
import { SidebarModelList } from './SidebarModelList';
import type { Model } from '@/types';

interface AdminSidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    models: { id: string; name: string; slug: string; image_url?: string }[];
    selectedModelIds: string[];
    onModelSelect: (modelId: string) => void;
    onClearSelection: () => void;
    onAddModel: () => void;
    onSettingsClick?: () => void;
    isLoading?: boolean;
    metrics?: Record<string, { views: number; clicks: number }>;
    onManageTrackingLinks?: (model: Model) => void;
}

export function AdminSidebar({
    isCollapsed,
    onToggleCollapse,
    models,
    selectedModelIds,
    onModelSelect,
    onClearSelection,
    onAddModel,
    onSettingsClick,
    isLoading = false,
    metrics,
    onManageTrackingLinks,
}: AdminSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const fluxRef = useMaterialFlux<HTMLElement>();
    const { isLightMode } = useAdminTheme();

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

            <aside
                ref={fluxRef}
                className={cn(
                    // Structure
                    "h-screen w-[280px] flex flex-col",
                    "sticky top-0 left-0",
                    "overflow-y-auto transition-all duration-300 z-50",
                    "fixed lg:relative",

                    // === DARK MODE (Default) ===
                    "bg-gradient-to-b from-[#3C3F40]/95 to-[#353839]/90",
                    "backdrop-blur-[40px] saturate-[180%]",
                    "border-r border-[#555D50]",
                    "shadow-[var(--admin-shadow-ao)]",

                    // === LIGHT MODE ===
                    "data-[theme=light]:bg-gradient-to-b data-[theme=light]:from-white/85 data-[theme=light]:to-[#F9F6EE]/90",
                    "data-[theme=light]:border-[#CED9EF]/60",
                    "data-[theme=light]:shadow-[var(--admin-shadow-light)]",

                    isCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-0" : "translate-x-0 w-[280px]"
                )}
                data-theme={isLightMode ? 'light' : 'dark'}
            >
                <div className={cn(
                    "px-4 py-5 border-b flex items-center justify-between",
                    "border-[#555D50]/50",
                    "data-[theme=light]:border-[#CED9EF]/50"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                    <h1 className={cn(
                        "text-lg font-semibold tracking-wide",
                        "text-[#E2DFD2]",
                        "data-[theme=light]:text-[#2E293A]"
                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                        ADMIN
                    </h1>
                    <button
                        onClick={onToggleCollapse}
                        className={cn(
                            "p-2 rounded-xl transition-all",
                            "hover:bg-[#5B4965]/20",
                            "active:scale-95",
                            "text-[#E2DFD2]/60 hover:text-[#E2DFD2]",
                            "data-[theme=light]:text-[#2E293A]/60 data-[theme=light]:hover:text-[#2E293A]"
                        )}
                        data-theme={isLightMode ? 'light' : 'dark'}
                        aria-label="Toggle sidebar"
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {/* Model List Container */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <SidebarModelList
                        models={models as Model[]}
                        selectedIds={selectedModelIds}
                        onModelToggle={onModelSelect}
                        onClearSelection={onClearSelection}
                        onEditModel={(model: Model) => {
                            // Trigger edit from parent
                            (window as any).dispatchEvent(new CustomEvent('edit-model', { detail: model }));
                        }}
                        onManageTrackingLinks={(model: Model) => {
                            if (onManageTrackingLinks) {
                                onManageTrackingLinks(model);
                            } else {
                                (window as any).dispatchEvent(new CustomEvent('manage-tracking', { detail: model }));
                            }
                        }}
                        isLoading={isLoading}
                        metrics={metrics}
                    />
                </div>

                {/* Settings Footer */}
                <SidebarSettings onAddModel={onAddModel} />
            </aside>
        </>
    );
}
