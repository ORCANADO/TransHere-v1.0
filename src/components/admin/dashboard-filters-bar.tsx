// ============================================
// TRANSHERE v1.1 - DASHBOARD FILTERS BAR COMPONENT
// iOS 26 Liquid Glass Dropdowns (Portal-Based)
// ============================================

'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar,
    Globe,
    Link2,
    RefreshCw,
    ChevronDown,
    Check,
    Users,
    Instagram,
    Twitter,
    Heart,
    Cloud,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import type { DashboardFilters, TimePeriod } from '@/types/charts';

interface SourceOption {
    name: string;
    icon: string;
}

interface DashboardFiltersBarProps {
    filters: DashboardFilters;
    onFiltersChange: (filters: Partial<DashboardFilters>) => void;
    availableCountries: string[];
    availableSources: SourceOption[];
    loading?: boolean;
}

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
    { value: 'hour', label: 'Last Hour' },
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Users,
    Instagram,
    Twitter,
    Heart,
    Cloud,
    Globe,
    ExternalLink,
    Link2,
};

const getIconComponent = (iconName: string) => ICON_MAP[iconName] || Link2;

const normalizeSourceName = (name: string): string => name.toLowerCase().trim();

export function DashboardFiltersBar({
    filters,
    onFiltersChange,
    availableCountries,
    availableSources,
    loading = false,
}: DashboardFiltersBarProps) {
    const { isLightMode } = useAdminTheme();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

    const triggerRefs = {
        period: useRef<HTMLButtonElement>(null),
        countries: useRef<HTMLButtonElement>(null),
        sources: useRef<HTMLButtonElement>(null),
    };

    const updatePosition = (dropdown: keyof typeof triggerRefs) => {
        const ref = triggerRefs[dropdown];
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 8,
                left: rect.left,
                width: Math.max(rect.width, 240),
            });
        }
    };

    const toggleDropdown = (dropdown: string) => {
        if (openDropdown === dropdown) {
            setOpenDropdown(null);
        } else {
            updatePosition(dropdown as any);
            setOpenDropdown(dropdown);
        }
    };

    useEffect(() => {
        const handleClose = () => setOpenDropdown(null);
        window.addEventListener('scroll', handleClose, true);
        window.addEventListener('resize', handleClose);
        return () => {
            window.removeEventListener('scroll', handleClose, true);
            window.removeEventListener('resize', handleClose);
        };
    }, []);

    const effectiveSources = useMemo(() => {
        if (availableSources && availableSources.length > 0) return availableSources;
        return [
            { name: 'Organic', icon: 'Globe' },
            { name: 'Instagram', icon: 'Instagram' },
            { name: 'X', icon: 'Twitter' },
            { name: 'Reddit', icon: 'Users' },
            { name: 'Model Directory', icon: 'ExternalLink' },
        ];
    }, [availableSources]);

    const handlePeriodChange = (period: TimePeriod) => {
        if (period !== 'custom') {
            onFiltersChange({ period, startDate: undefined, endDate: undefined });
            setOpenDropdown(null);
        } else {
            onFiltersChange({ period });
        }
    };

    const handleCountryToggle = (country: string) => {
        const currentCountries = filters.countries || [];
        onFiltersChange({
            countries: currentCountries.includes(country)
                ? currentCountries.filter(c => c !== country)
                : [...currentCountries, country]
        });
    };

    const handleSourceToggle = (sourceName: string) => {
        const currentSources = filters.sources || [];
        const isSelected = currentSources.some(s => normalizeSourceName(s) === normalizeSourceName(sourceName));
        onFiltersChange({
            sources: isSelected
                ? currentSources.filter(s => normalizeSourceName(s) !== normalizeSourceName(sourceName))
                : [...currentSources, sourceName]
        });
    };

    const getCountriesDisplay = () => {
        const count = filters.countries?.length || 0;
        return count === 0 ? "All Countries" : `${count} ${count === 1 ? 'country' : 'countries'}`;
    };

    const getSourcesDisplay = () => {
        const count = filters.sources?.length || 0;
        return count === 0 ? "All Sources" : `${count} ${count === 1 ? 'source' : 'sources'}`;
    };

    return (
        <div className={cn(
            "flex flex-wrap items-center gap-3 p-4 rounded-2xl",
            "bg-[#353839]/30 border border-[#555D50]/20",
            "data-[theme=light]:bg-white/30 data-[theme=light]:border-[#CED9EF]/30"
        )} data-theme={isLightMode ? 'light' : 'dark'}>

            {/* Time Period Filter */}
            <div className="relative">
                <button
                    ref={triggerRefs.period}
                    onClick={() => toggleDropdown('period')}
                    className={cn(
                        "flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl min-w-[140px] text-sm font-medium transition-all duration-150",
                        "bg-[#3C3F40]/70 backdrop-blur-[8px] border border-[#555D50] text-[#E2DFD2]",
                        "hover:bg-[#5B4965]/40 hover:border-[#5B4965]",
                        "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A]",
                        "data-[theme=light]:hover:bg-[#EFC8DF]/30 data-[theme=light]:hover:border-[#EFC8DF]"
                    )}
                    data-theme={isLightMode ? 'light' : 'dark'}
                >
                    <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{TIME_PERIODS.find(p => p.value === filters.period)?.label || 'Select Period'}</span>
                    </span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", "text-[#9E9E9E] data-[theme=light]:text-[#6B6B7B]", openDropdown === 'period' && "rotate-180")} />
                </button>

                {openDropdown === 'period' && createPortal(
                    <div
                        style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 9999 }}
                        className={cn(
                            "max-h-[400px] overflow-y-auto rounded-2xl bg-[#3C3F40]/[0.98] backdrop-blur-[24px] border border-[#555D50] shadow-2xl",
                            "data-[theme=light]:bg-white/[0.98] data-[theme=light]:border-[#CED9EF]/60"
                        )}
                        data-theme={isLightMode ? 'light' : 'dark'}
                    >
                        <div className="py-1">
                            {TIME_PERIODS.map((period) => (
                                <button
                                    key={period.value}
                                    onClick={() => handlePeriodChange(period.value)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors",
                                        "text-[#E2DFD2] data-[theme=light]:text-[#2E293A]",
                                        filters.period === period.value
                                            ? "bg-[#5B4965]/50 data-[theme=light]:bg-[#CED9EF]/50"
                                            : "hover:bg-[#5B4965]/30 data-[theme=light]:hover:bg-[#EFC8DF]/30"
                                    )}
                                    data-theme={isLightMode ? 'light' : 'dark'}
                                >
                                    <span>{period.label}</span>
                                    {filters.period === period.value && <Check className="w-4 h-4 text-[#00FF85]" />}
                                </button>
                            ))}
                        </div>
                        {filters.period === 'custom' && (
                            <div className={cn("p-4 border-t space-y-3 border-[#555D50]/50 data-[theme=light]:border-[#CED9EF]/50")} data-theme={isLightMode ? 'light' : 'dark'}>
                                <DatePicker value={filters.startDate || ''} onChange={(d) => onFiltersChange({ startDate: d || undefined })} placeholder="Start date" />
                                <DatePicker value={filters.endDate || ''} onChange={(d) => onFiltersChange({ endDate: d || undefined })} placeholder="End date" />
                            </div>
                        )}
                    </div>,
                    document.body
                )}
            </div>

            {/* Country Filter */}
            <div className="relative">
                <button
                    ref={triggerRefs.countries}
                    onClick={() => toggleDropdown('countries')}
                    className={cn(
                        "flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl min-w-[140px] text-sm font-medium transition-all duration-150",
                        "bg-[#3C3F40]/70 backdrop-blur-[8px] border border-[#555D50] text-[#E2DFD2]",
                        "hover:bg-[#5B4965]/40 hover:border-[#5B4965]",
                        "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A]",
                        "data-[theme=light]:hover:bg-[#EFC8DF]/30 data-[theme=light]:hover:border-[#EFC8DF]"
                    )}
                    data-theme={isLightMode ? 'light' : 'dark'}
                >
                    <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span>{getCountriesDisplay()}</span>
                    </span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", "text-[#9E9E9E] data-[theme=light]:text-[#6B6B7B]", openDropdown === 'countries' && "rotate-180")} />
                </button>

                {openDropdown === 'countries' && createPortal(
                    <div
                        style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 9999 }}
                        className={cn(
                            "max-h-[300px] overflow-y-auto rounded-2xl bg-[#3C3F40]/[0.98] backdrop-blur-[24px] border border-[#555D50] shadow-2xl",
                            "data-[theme=light]:bg-white/[0.98] data-[theme=light]:border-[#CED9EF]/60"
                        )}
                        data-theme={isLightMode ? 'light' : 'dark'}
                    >
                        <div className={cn("flex items-center justify-between px-4 py-2 border-b border-[#555D50]/50 data-[theme=light]:border-[#CED9EF]/50")} data-theme={isLightMode ? 'light' : 'dark'}>
                            <button onClick={() => onFiltersChange({ countries: availableCountries })} className="text-xs font-medium text-[#00FF85]">Select All</button>
                            <button onClick={() => onFiltersChange({ countries: [] })} className="text-xs font-medium text-[#9E9E9E] hover:text-[#E2DFD2] data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#2E293A]">Clear</button>
                        </div>
                        <div className="py-1">
                            {availableCountries.map((country) => (
                                <button
                                    key={country}
                                    onClick={() => handleCountryToggle(country)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors",
                                        "text-[#E2DFD2] data-[theme=light]:text-[#2E293A]",
                                        filters.countries?.includes(country) ? "bg-[#5B4965]/50 data-[theme=light]:bg-[#CED9EF]/50" : "hover:bg-[#5B4965]/30 data-[theme=light]:hover:bg-[#EFC8DF]/30"
                                    )}
                                    data-theme={isLightMode ? 'light' : 'dark'}
                                >
                                    <span>{country}</span>
                                    {filters.countries?.includes(country) && <Check className="w-4 h-4 text-[#00FF85]" />}
                                </button>
                            ))}
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* Source Filter */}
            <div className="relative">
                <button
                    ref={triggerRefs.sources}
                    onClick={() => toggleDropdown('sources')}
                    className={cn(
                        "flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl min-w-[140px] text-sm font-medium transition-all duration-150",
                        "bg-[#3C3F40]/70 backdrop-blur-[8px] border border-[#555D50] text-[#E2DFD2]",
                        "hover:bg-[#5B4965]/40 hover:border-[#5B4965]",
                        "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A]",
                        "data-[theme=light]:hover:bg-[#EFC8DF]/30 data-[theme=light]:hover:border-[#EFC8DF]"
                    )}
                    data-theme={isLightMode ? 'light' : 'dark'}
                >
                    <span className="flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        <span>{getSourcesDisplay()}</span>
                    </span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", "text-[#9E9E9E] data-[theme=light]:text-[#6B6B7B]", openDropdown === 'sources' && "rotate-180")} />
                </button>

                {openDropdown === 'sources' && createPortal(
                    <div
                        style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 9999 }}
                        className={cn(
                            "max-h-[300px] overflow-y-auto rounded-2xl bg-[#3C3F40]/[0.98] backdrop-blur-[24px] border border-[#555D50] shadow-2xl",
                            "data-[theme=light]:bg-white/[0.98] data-[theme=light]:border-[#CED9EF]/60"
                        )}
                        data-theme={isLightMode ? 'light' : 'dark'}
                    >
                        <div className={cn("flex items-center justify-between px-4 py-2 border-b border-[#555D50]/50 data-[theme=light]:border-[#CED9EF]/50")} data-theme={isLightMode ? 'light' : 'dark'}>
                            <button onClick={() => onFiltersChange({ sources: effectiveSources.map(s => s.name) })} className="text-xs font-medium text-[#00FF85]">Select All</button>
                            <button onClick={() => onFiltersChange({ sources: [] })} className="text-xs font-medium text-[#9E9E9E] hover:text-[#E2DFD2] data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#2E293A]">Clear</button>
                        </div>
                        <div className="py-1">
                            {effectiveSources.map((source) => {
                                const isSelected = filters.sources?.some(s => normalizeSourceName(s) === normalizeSourceName(source.name));
                                const IconComponent = getIconComponent(source.icon);
                                return (
                                    <button
                                        key={source.name}
                                        onClick={() => handleSourceToggle(source.name)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors",
                                            "text-[#E2DFD2] data-[theme=light]:text-[#2E293A]",
                                            isSelected ? "bg-[#5B4965]/50 data-[theme=light]:bg-[#CED9EF]/50" : "hover:bg-[#5B4965]/30 data-[theme=light]:hover:bg-[#EFC8DF]/30"
                                        )}
                                        data-theme={isLightMode ? 'light' : 'dark'}
                                    >
                                        <span className="flex items-center gap-3">
                                            <IconComponent className="w-4 h-4 text-[#9E9E9E] data-[theme=light]:text-[#6B6B7B]" />
                                            {source.name}
                                        </span>
                                        {isSelected && <Check className="w-4 h-4 text-[#00FF85]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* Refresh */}
            <button
                onClick={() => onFiltersChange({})}
                disabled={loading}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150",
                    "bg-[#3C3F40]/70 border border-[#555D50] text-[#E2DFD2]",
                    "hover:bg-[#5B4965]/40 hover:border-[#5B4965]",
                    "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A]",
                    "disabled:opacity-50"
                )}
                data-theme={isLightMode ? 'light' : 'dark'}
            >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                <span>Refresh</span>
            </button>
        </div>
    );
}