// ============================================
// TRANSHERE v1.1 - DASHBOARD FILTERS BAR COMPONENT
// Multi-Select Country and Source Filters with Popover UI
// ============================================

'use client';

import * as React from 'react';
import { useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DashboardFilters, TimePeriod } from '@/types/charts';

/**
 * Source option type for the dropdown
 */
interface SourceOption {
    name: string;
    icon: string; // Lucide icon name
}

/**
 * Props for DashboardFiltersBar component
 */
interface DashboardFiltersBarProps {
    filters: DashboardFilters;
    onFiltersChange: (filters: Partial<DashboardFilters>) => void;
    availableCountries: string[];
    availableSources: SourceOption[];
    loading?: boolean;
}

/**
 * Time period options with labels
 */
const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
    { value: 'hour', label: 'Last Hour' },
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' },
    { value: 'custom', label: 'Custom Range' },
];

/**
 * Icon mapping from string names to components
 */
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

/**
 * Get icon component from string name
 */
const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || Link2;
};

/**
 * Default source options - MUST match traffic_sources table names/slugs
 * These are the display names that will be sent to the API
 */
const DEFAULT_SOURCES: SourceOption[] = [
    { name: 'Organic', icon: 'Globe' },
    { name: 'Instagram', icon: 'Instagram' },
    { name: 'X', icon: 'Twitter' },
    { name: 'Reddit', icon: 'Users' },
    { name: 'Model Directory', icon: 'ExternalLink' },
];

/**
 * Normalize source name for consistent matching
 */
const normalizeSourceName = (name: string): string => {
    return name.toLowerCase().trim();
};

/**
 * DashboardFiltersBar - Main Filter Component
 */
export function DashboardFiltersBar({
    filters,
    onFiltersChange,
    availableCountries,
    availableSources = DEFAULT_SOURCES,
    loading = false,
}: DashboardFiltersBarProps) {
    // Dropdown open states
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // Derive actual sources to use
    const effectiveSources = React.useMemo(() => {
        // If API provided sources, use those (they're authoritative)
        if (availableSources && availableSources.length > 0) {
            return availableSources;
        }
        // Fallback to defaults
        return DEFAULT_SOURCES;
    }, [availableSources]);

    // Toggle dropdown
    const toggleDropdown = (dropdown: string) => {
        setOpenDropdown(current => current === dropdown ? null : dropdown);
    };

    // Handle time period changes
    const handlePeriodChange = (period: TimePeriod) => {
        if (period !== 'custom') {
            onFiltersChange({
                period,
                startDate: undefined,
                endDate: undefined,
            });
        } else {
            onFiltersChange({ period });
        }
        setOpenDropdown(null);
    };

    // Handle country multi-select
    const handleCountryToggle = (country: string) => {
        const currentCountries = filters.countries || [];
        const isSelected = currentCountries.includes(country);

        if (isSelected) {
            onFiltersChange({
                countries: currentCountries.filter(c => c !== country)
            });
        } else {
            onFiltersChange({
                countries: [...currentCountries, country]
            });
        }
    };

    const handleSelectAllCountries = () => {
        onFiltersChange({ countries: availableCountries });
    };

    const handleClearCountries = () => {
        onFiltersChange({ countries: [] });
    };

    // Handle source multi-select
    const handleSourceToggle = (sourceName: string) => {
        const currentSources = filters.sources || [];
        const normalizedName = sourceName; // Keep original case for display
        const isSelected = currentSources.some(
            s => normalizeSourceName(s) === normalizeSourceName(sourceName)
        );

        if (isSelected) {
            onFiltersChange({
                sources: currentSources.filter(
                    s => normalizeSourceName(s) !== normalizeSourceName(sourceName)
                )
            });
        } else {
            onFiltersChange({
                sources: [...currentSources, normalizedName]
            });
        }
    };

    const handleSelectAllSources = () => {
        onFiltersChange({ sources: effectiveSources.map(s => s.name) });
    };

    const handleClearSources = () => {
        onFiltersChange({ sources: [] });
    };

    // Get display text for multi-select buttons
    const getCountriesDisplay = () => {
        const count = filters.countries?.length || 0;
        return count === 0 ? "All Countries" : `${count} ${count === 1 ? 'country' : 'countries'}`;
    };

    const getSourcesDisplay = () => {
        const count = filters.sources?.length || 0;
        return count === 0 ? "All Sources" : `${count} ${count === 1 ? 'source' : 'sources'}`;
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Time Period Filter */}
            <Popover open={openDropdown === 'period'} onOpenChange={() => toggleDropdown('period')}>
                <PopoverTrigger asChild>
                    <button
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                            "bg-glass-surface border border-obsidian-rim",
                            "hover:bg-glass-surface/80 shadow-sm active:scale-95",
                            openDropdown === 'period' && "ring-2 ring-accent-violet/50"
                        )}
                    >
                        <Calendar className={cn("w-4 h-4", openDropdown === 'period' ? "text-accent-violet" : "text-glass-muted")} />
                        <span className="text-glass-primary">
                            {TIME_PERIODS.find(p => p.value === filters.period)?.label || 'Select Period'}
                        </span>
                        <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            openDropdown === 'period' && "rotate-180"
                        )} />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="min-w-[200px] bg-glass-surface backdrop-blur-thick rounded-2xl border border-obsidian-rim shadow-ao-stack"
                    align="start"
                    side="bottom"
                    sideOffset={8}
                >
                    <div className="py-1">
                        {TIME_PERIODS.map((period) => (
                            <button
                                key={period.value}
                                onClick={() => handlePeriodChange(period.value)}
                                className={cn(
                                    "w-full px-4 py-2.5 text-left text-sm hover:bg-glass-surface transition-colors cursor-pointer",
                                    filters.period === period.value
                                        ? "text-accent-violet font-bold"
                                        : "text-glass-primary"
                                )}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Range */}
                    {filters.period === 'custom' && (
                        <div className="p-3 border-t border-obsidian-rim space-y-2">
                            <p className="text-[10px] uppercase tracking-widest text-glass-muted font-bold px-1 mb-1">Custom Range</p>
                            <DatePicker
                                value={filters.startDate || ''}
                                onChange={(date) => {
                                    onFiltersChange({ startDate: date || undefined });
                                }}
                                placeholder="Start date"
                                max={filters.endDate || ''}
                            />
                            <DatePicker
                                value={filters.endDate || ''}
                                onChange={(date) => {
                                    onFiltersChange({ endDate: date || undefined });
                                }}
                                placeholder="End date"
                                min={filters.startDate || ''}
                            />
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {/* Country Multi-Select */}
            <Popover open={openDropdown === 'countries'} onOpenChange={() => toggleDropdown('countries')}>
                <PopoverTrigger asChild>
                    <button
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                            "bg-glass-surface border border-obsidian-rim",
                            "hover:bg-glass-surface/80 shadow-sm active:scale-95",
                            openDropdown === 'countries' && "ring-2 ring-accent-violet/50"
                        )}
                    >
                        <Globe className={cn("w-4 h-4", openDropdown === 'countries' ? "text-accent-violet" : "text-glass-muted")} />
                        <span className="text-glass-primary">
                            {getCountriesDisplay()}
                        </span>
                        <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            openDropdown === 'countries' && "rotate-180"
                        )} />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="min-w-[200px] bg-glass-surface backdrop-blur-thick rounded-2xl border border-obsidian-rim shadow-ao-stack"
                    align="start"
                    side="bottom"
                    sideOffset={8}
                >
                    <div className="max-h-[300px] overflow-y-auto">
                        {/* Select All / Clear Actions */}
                        <div className="p-3 border-b border-obsidian-rim space-y-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSelectAllCountries}
                                    className="flex-1 px-3 py-1.5 text-xs bg-accent-violet text-white rounded-lg hover:opacity-90 transition-opacity font-bold shadow-sm"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={handleClearCountries}
                                    className="flex-1 px-3 py-1.5 text-xs bg-glass-surface border border-obsidian-rim text-glass-primary rounded-lg hover:bg-glass-surface/80 transition-all font-bold"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Country List */}
                        <div className="py-1">
                            {availableCountries.map((country) => {
                                const isSelected = filters.countries?.includes(country) || false;
                                return (
                                    <button
                                        key={country}
                                        onClick={() => handleCountryToggle(country)}
                                        className={cn(
                                            "w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer",
                                            isSelected
                                                ? "bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#007AFF]"
                                                : "text-[#1D1D1F] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 border-2 rounded-lg flex items-center justify-center transition-all",
                                            isSelected
                                                ? "bg-accent-violet border-accent-violet"
                                                : "border-obsidian-rim"
                                        )}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span>{country}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Source Multi-Select */}
            <Popover open={openDropdown === 'sources'} onOpenChange={() => toggleDropdown('sources')}>
                <PopoverTrigger asChild>
                    <button
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                            "bg-glass-surface border border-obsidian-rim",
                            "hover:bg-glass-surface/80 shadow-sm active:scale-95",
                            openDropdown === 'sources' && "ring-2 ring-accent-violet/50"
                        )}
                    >
                        <Link2 className={cn("w-4 h-4", openDropdown === 'sources' ? "text-accent-violet" : "text-glass-muted")} />
                        <span className="text-glass-primary">
                            {getSourcesDisplay()}
                        </span>
                        <ChevronDown className={cn(
                            "w-4 h-4 transition-transform duration-200",
                            openDropdown === 'sources' && "rotate-180"
                        )} />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="min-w-[200px] bg-glass-surface backdrop-blur-thick rounded-2xl border border-obsidian-rim shadow-ao-stack"
                    align="start"
                    side="bottom"
                    sideOffset={8}
                >
                    <div className="max-h-[300px] overflow-y-auto">
                        {/* Select All / Clear Actions */}
                        <div className="p-3 border-b border-obsidian-rim space-y-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSelectAllSources}
                                    className="flex-1 px-3 py-1.5 text-xs bg-accent-violet text-white rounded-lg hover:opacity-90 transition-opacity font-bold shadow-sm"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={handleClearSources}
                                    className="flex-1 px-3 py-1.5 text-xs bg-glass-surface border border-obsidian-rim text-glass-primary rounded-lg hover:bg-glass-surface/80 transition-all font-bold"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Source List */}
                        <div className="py-1">
                            {effectiveSources.map((source) => {
                                const isSelected = (filters.sources || []).some(
                                    s => normalizeSourceName(s) === normalizeSourceName(source.name)
                                );
                                const IconComponent = getIconComponent(source.icon);
                                return (
                                    <button
                                        key={source.name}
                                        onClick={() => handleSourceToggle(source.name)}
                                        className={cn(
                                            "w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-3 cursor-pointer",
                                            isSelected
                                                ? "bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#007AFF]"
                                                : "text-[#1D1D1F] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 border-2 rounded-lg flex items-center justify-center transition-all",
                                            isSelected
                                                ? "bg-accent-violet border-accent-violet"
                                                : "border-obsidian-rim"
                                        )}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <IconComponent className="w-4 h-4" />
                                        <span>{source.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <button
                onClick={() => onFiltersChange({})}
                disabled={loading}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    "bg-glass-surface border border-obsidian-rim",
                    "hover:bg-glass-surface/80 shadow-sm active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
            >
                <RefreshCw className={cn(
                    "w-4 h-4 text-glass-muted",
                    loading && "animate-spin"
                )} />
                <span className="text-glass-primary">Refresh</span>
            </button>

            {/* Loading Indicator */}
            {loading && (
                <div className="ml-2 w-5 h-5 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
            )}
        </div>
    );
}