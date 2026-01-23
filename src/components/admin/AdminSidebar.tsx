'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaterialFlux } from '@/hooks/use-material-flux';
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
                    "h-screen transition-all duration-300 flex flex-col overflow-hidden z-50",
                    "fixed lg:relative",
                    // Thick Glass Physics
                    "backdrop-blur-[40px] saturate-[180%]",
                    // Obsidian Surface (Dark)
                    "bg-[var(--surface-obsidian-glass)]/80",
                    // AO Shadow Stack
                    "shadow-[var(--shadow-ao-stack)]",
                    // Super-Ellipse Border
                    "rounded-[var(--radius-squircle)]",
                    // Rim Highlight
                    "border-r border-[var(--border-obsidian-rim)]/30",
                    // Light Mode Override
                    "liquid-light:bg-[var(--surface-irid-glass)]",
                    "liquid-light:border-white/60",
                    // Material Flux
                    "flux-border",
                    isCollapsed ? "-translate-x-full lg:translate-x-0 lg:w-0" : "translate-x-0 w-[280px]"
                )}>
                <header className="flex items-center justify-between p-4 border-b border-[var(--border-obsidian-rim)]/20">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)] tracking-tight uppercase">Admin</span>
                    </div>
                    <button
                        onClick={onToggleCollapse}
                        className={cn(
                            "p-2 rounded-xl transition-all",
                            "hover:bg-[var(--surface-obsidian-glass)]/40",
                            "active:scale-95",
                            "text-[var(--text-obsidian-muted)] hover:text-[var(--text-obsidian-primary)]",
                            "liquid-light:text-[var(--text-irid-primary)]/60 liquid-light:hover:text-[var(--text-irid-primary)]"
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
