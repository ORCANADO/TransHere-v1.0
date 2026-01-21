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
    onClearSelection: () => void;
    onAddModel: () => void;
    onSettingsClick?: () => void;
    isLoading?: boolean;
    metrics?: Record<string, { views: number; clicks: number }>;
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
                "h-screen transition-all duration-300 flex flex-col overflow-hidden z-50",
                "fixed lg:relative",
                // iOS 26 Liquid Glass - Titanium white for light mode, dark translucent for dark
                "bg-background",
                "backdrop-blur-3xl",
                "border-r border-border",
                "shadow-[1px_0_0_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
                isCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-0" : "translate-x-0 w-[280px]"
            )}>
                <header className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-xl",
                            "bg-gradient-to-br from-[#7A27FF] via-[#9D4EFF] to-[#00FF85]",
                            "shadow-lg shadow-[#7A27FF]/20",
                            "flex items-center justify-center",
                            "ring-1 ring-white/20"
                        )}>
                            <span className="text-white font-bold text-sm drop-shadow-sm">TH</span>
                        </div>
                        <span className="font-bold text-sm text-foreground tracking-tight">TransHere</span>
                    </div>
                    <button
                        onClick={onToggleCollapse}
                        className={cn(
                            "p-2 rounded-xl transition-all",
                            "hover:bg-black/[0.04] dark:hover:bg-white/10",
                            "active:scale-95",
                            "text-muted-foreground hover:text-foreground"
                        )}
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
                        onModelToggle={onModelSelect}
                        onClearSelection={onClearSelection}
                        onEditModel={(model: Model) => {
                            // Trigger edit from parent
                            (window as any).dispatchEvent(new CustomEvent('edit-model', { detail: model }));
                        }}
                        onManageTrackingLinks={(model: Model) => {
                            (window as any).dispatchEvent(new CustomEvent('manage-tracking', { detail: model }));
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
