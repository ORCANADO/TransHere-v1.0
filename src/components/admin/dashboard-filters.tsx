// ============================================
// TRANSHERE v1.1 - DASHBOARD FILTERS COMPONENT
// Comprehensive Filter Bar with Multi-Select Support
// ============================================

'use client';

import * as React from 'react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Calendar,
    Globe,
    Link2,
    Users,
    X,
    ChevronDown,
    Check,
    Search,
    Instagram,
    Twitter,
    MessageCircle,
    Video,
    Facebook,
    Heart,
    Cloud
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/utils';
import type {
    DashboardFilters,
    TimePeriod,
    TrafficSourceOption,
    ModelFilterOption
} from '@/types/charts';
import { DatePicker } from '@/components/ui/date-picker';

/**
 * Props for DashboardFiltersBar component
 */
interface DashboardFiltersBarProps {
    filters: DashboardFilters;
    onFiltersChange: (filters: DashboardFilters) => void;
    availableCountries: string[];
    availableSources: TrafficSourceOption[];
    isLoading?: boolean;
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
 * Filter Dropdown Container
 */
function FilterDropdown({
    trigger,
    isOpen,
    onToggle,
    children,
    className,
}: React.PropsWithChildren<{
    trigger: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    className?: string;
}>) {
    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    "bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10",
                    "hover:bg-[#EBECF0] dark:hover:bg-white/10 shadow-sm active:scale-95",
                    isOpen && "ring-2 ring-[#007AFF]/20 dark:ring-[#7A27FF]/50",
                    className
                )}
            >
                {trigger}
                <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={onToggle}
                    />

                    {/* Dropdown Content */}
                    <div className="absolute top-full mt-2 z-[60] min-w-[220px] max-h-[450px] overflow-auto bg-[#F9F9FB]/95 dark:bg-[#0A1221]/95 backdrop-blur-3xl rounded-2xl border border-[#E5E5EA] dark:border-white/10 shadow-2xl">
                        {children}
                    </div>
                </>
            )}
        </div>
    );
}


/**
 * Traffic Source Options with Icons
 */
const TRAFFIC_SOURCES_WITH_ICONS = [
    { name: 'Instagram', icon: Instagram },
    { name: 'X', icon: Twitter },
    { name: 'Reddit', icon: MessageCircle },
    { name: 'TikTok', icon: Video },
    { name: 'Facebook', icon: Facebook },
    { name: 'Dating app', icon: Heart },
    { name: 'Bluesky', icon: Cloud },
];

/**
 * DashboardFiltersBar - Main Filter Component
 */
export function DashboardFiltersBar({
    filters,
    onFiltersChange,
    availableCountries,
    availableSources,
    isLoading = false,
}: DashboardFiltersBarProps) {
    // Dropdown open states
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [countrySearch, setCountrySearch] = useState('');

    // Helper to update single filter
    const updateFilter = useCallback(<K extends keyof DashboardFilters>(
        key: K,
        value: DashboardFilters[K]
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    }, [filters, onFiltersChange]);

    // Toggle dropdown
    const toggleDropdown = useCallback((dropdown: string) => {
        setOpenDropdown(current => current === dropdown ? null : dropdown);
    }, []);

    // Close all dropdowns
    const closeDropdowns = useCallback(() => {
        setOpenDropdown(null);
    }, []);

    // Map available sources to subtags lookup
    const availableSubtags = useMemo(() => {
        const map: Record<string, string[]> = {};
        availableSources.forEach(s => {
            map[s.name] = s.subtags?.map(st => st.name) || [];
        });
        return map;
    }, [availableSources]);

    // Source Selection Handlers
    const handleSourceToggle = useCallback((sourceName: string) => {
        const currentSources = filters.sources || [];
        const existing = currentSources.find(s => s.source === sourceName);

        if (existing) {
            // Deselect: remove this source entirely
            updateFilter('sources', currentSources.filter(s => s.source !== sourceName));
        } else {
            // Select: add source with empty subtags (means "all subtags")
            updateFilter('sources', [...currentSources, { source: sourceName, subtags: [] }]);
        }
    }, [filters.sources, updateFilter]);

    const handleSubtagToggle = useCallback((sourceName: string, subtagName: string) => {
        const currentSources = filters.sources || [];
        const sourceIndex = currentSources.findIndex(s => s.source === sourceName);

        if (sourceIndex === -1) {
            // Source not selected, add it with this subtag
            updateFilter('sources', [...currentSources, { source: sourceName, subtags: [subtagName] }]);
            return;
        }

        const source = currentSources[sourceIndex];
        const hasSubtag = source.subtags.includes(subtagName);
        const newSubtags = hasSubtag
            ? source.subtags.filter((st: string) => st !== subtagName)
            : [...source.subtags, subtagName];

        const newSource = { ...source, subtags: newSubtags };
        const newSources = [...currentSources.slice(0, sourceIndex), newSource, ...currentSources.slice(sourceIndex + 1)];
        updateFilter('sources', newSources);
    }, [filters.sources, updateFilter]);

    const isSourceSelected = useCallback((sourceName: string) =>
        (filters.sources || []).some(s => s.source === sourceName),
        [filters.sources]
    );

    const isSubtagSelected = useCallback((sourceName: string, subtagName: string) => {
        const source = (filters.sources || []).find(s => s.source === sourceName);
        return source?.subtags.includes(subtagName) || false;
    }, [filters.sources]);

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Date Period Filter */}
            <FilterDropdown
                trigger={
                    <>
                        <Calendar className="w-4 h-4 text-[#86868B]" />
                        <span className="text-[#1D1D1F] dark:text-white">
                            {TIME_PERIODS.find(p => p.value === filters.period)?.label || 'Select Period'}
                        </span>
                    </>
                }
                isOpen={openDropdown === 'period'}
                onToggle={() => toggleDropdown('period')}
                className="min-w-[140px]"
            >
                <div className="py-1">
                    {TIME_PERIODS.map((period) => (
                        <button
                            key={period.value}
                            onClick={(e) => {
                                e.stopPropagation();
                                const newFilters = { ...filters, period: period.value };

                                if (period.value !== 'custom') {
                                    newFilters.startDate = null;
                                    newFilters.endDate = null;
                                    onFiltersChange(newFilters);
                                    closeDropdowns();
                                } else {
                                    onFiltersChange(newFilters);
                                    // Don't close for custom - let them pick dates
                                }
                            }}
                            className={cn(
                                "w-full px-4 py-2.5 text-left text-sm hover:bg-black/[0.05] dark:hover:bg-white/5 transition-colors cursor-pointer",
                                filters.period === period.value
                                    ? "text-[#007AFF] dark:text-[#007AFF] font-bold"
                                    : "text-[#1D1D1F] dark:text-white"
                            )}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>

                {/* Always show Custom Date Range if available in state or just below */}
                <div className="p-3 border-t border-[#E5E5EA] dark:border-white/10 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-[#86868B] font-bold px-1 mb-1">Custom Range</p>
                    <DatePicker
                        value={filters.startDate || ''}
                        onChange={(date) => {
                            const newFilters = { ...filters, period: 'custom' as TimePeriod, startDate: date || null };
                            onFiltersChange(newFilters);
                        }}
                        placeholder="Start date"
                        max={filters.endDate || undefined}
                    />
                    <DatePicker
                        value={filters.endDate || ''}
                        onChange={(date) => {
                            const newFilters = { ...filters, period: 'custom' as TimePeriod, endDate: date || null };
                            onFiltersChange(newFilters);
                        }}
                        placeholder="End date"
                        min={filters.startDate || undefined}
                    />
                </div>
            </FilterDropdown>

            {/* Country Filter */}
            <FilterDropdown
                trigger={
                    <>
                        <Globe className="w-4 h-4 text-[#86868B]" />
                        <span className="text-[#1D1D1F] dark:text-white">
                            {filters.country || 'All Countries'}
                        </span>
                    </>
                }
                isOpen={openDropdown === 'country'}
                onToggle={() => {
                    toggleDropdown('country');
                    if (openDropdown !== 'country') setCountrySearch('');
                }}
                className="min-w-[160px]"
            >
                <div className="flex flex-col max-h-[450px]">
                    {/* Search Input */}
                    <div className="p-3 border-b border-[#E5E5EA] dark:border-white/10 sticky top-0 bg-[#F9F9FB]/90 dark:bg-[#0A1221]/90 backdrop-blur-md z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868B]" />
                            <input
                                type="text"
                                placeholder="Search countries..."
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                className="w-full pl-9 pr-2 py-2 text-xs bg-[#EBECF0] dark:bg-white/5 border border-transparent dark:border-white/10 rounded-lg text-[#1D1D1F] dark:text-white placeholder:text-[#86868B] dark:placeholder:text-white/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="overflow-y-auto overflow-x-hidden min-w-[180px]">
                        <button
                            onClick={() => {
                                updateFilter('country', null);
                                closeDropdowns();
                            }}
                            className={cn(
                                "w-full px-4 py-3 text-left text-sm transition-colors block font-medium",
                                !filters.country
                                    ? "bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#007AFF]"
                                    : "text-[#1D1D1F] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/10"
                            )}
                        >
                            All Countries
                        </button>

                        {availableCountries
                            .filter(country =>
                                country.toLowerCase().includes(countrySearch.toLowerCase())
                            )
                            .map((country) => (
                                <button
                                    key={country}
                                    onClick={() => {
                                        updateFilter('country', country);
                                        closeDropdowns();
                                    }}
                                    className={cn(
                                        "w-full px-4 py-2.5 text-left text-sm transition-colors block font-medium",
                                        filters.country === country
                                            ? "bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#007AFF]"
                                            : "text-[#1D1D1F] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/10"
                                    )}
                                >
                                    {country}
                                </button>
                            ))}
                    </div>
                </div>
            </FilterDropdown>

            {/* Traffic Source Filter */}
            <FilterDropdown
                trigger={
                    <>
                        <Link2 className="w-4 h-4 text-[#86868B]" />
                        <span className="text-[#1D1D1F] dark:text-white">
                            {filters.sources.length === 0
                                ? 'All Sources'
                                : filters.sources.length === 1
                                    ? (filters.sources[0].subtags.length === 1
                                        ? `${filters.sources[0].source}: ${filters.sources[0].subtags[0]}`
                                        : filters.sources[0].source)
                                    : `${filters.sources.length} Sources`
                            }
                        </span>
                    </>
                }
                isOpen={openDropdown === 'source'}
                onToggle={() => toggleDropdown('source')}
                className="min-w-[150px]"
            >
                <div className="py-2 px-1 max-h-[400px] overflow-y-auto min-w-[200px]">
                    {/* All Sources Option */}
                    <button
                        onClick={() => {
                            updateFilter('sources', []);
                        }}
                        className={cn(
                            "w-full px-3 py-2.5 text-left text-sm hover:bg-black/[0.05] dark:hover:bg-white/5 transition-colors rounded-xl mb-1 font-medium",
                            filters.sources.length === 0 ? "text-[#007AFF] dark:text-[#007AFF] font-bold" : "text-[#1D1D1F] dark:text-white"
                        )}
                    >
                        All Sources
                    </button>

                    {/* Source List with Subtags */}
                    {availableSources.map((source) => {
                        // Find matching icon case-insensitively
                        const IconComponent = TRAFFIC_SOURCES_WITH_ICONS.find(
                            i => i.name.toLowerCase() === source.name.toLowerCase()
                        )?.icon || Link2;

                        return (
                            <div key={source.name} className="mb-1">
                                <div
                                    onClick={() => handleSourceToggle(source.name)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-xl transition-all font-medium",
                                        isSourceSelected(source.name)
                                            ? "bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#007AFF]"
                                            : "text-[#1D1D1F] dark:text-white/80 hover:bg-black/[0.05] dark:hover:bg-white/10"
                                    )}
                                >
                                    <IconComponent className="w-4 h-4" />
                                    <span className="text-sm">{source.name}</span>
                                    {isSourceSelected(source.name) && (
                                        <Check className="w-4 h-4 ml-auto" />
                                    )}
                                </div>

                                {/* Subtags nested under source */}
                                {isSourceSelected(source.name) && availableSubtags[source.name]?.length > 0 && (
                                    <div className="ml-6 mt-1 space-y-1">
                                        {availableSubtags[source.name].map(subtag => (
                                            <div
                                                key={subtag}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSubtagToggle(source.name, subtag);
                                                }}
                                                className={cn(
                                                    "px-3 py-2 text-xs cursor-pointer rounded-lg transition-all flex items-center justify-between font-medium",
                                                    isSubtagSelected(source.name, subtag)
                                                        ? "bg-[#007AFF]/5 dark:bg-[#7A27FF]/10 text-[#007AFF] dark:text-[#7A27FF]"
                                                        : "text-[#86868B] dark:text-white/60 hover:text-[#1D1D1F] dark:hover:text-white"
                                                )}
                                            >
                                                <span>{subtag}</span>
                                                {isSubtagSelected(source.name, subtag) && (
                                                    <Check className="w-3 h-3" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </FilterDropdown>


            {/* Clear All Filters */}
            {(filters.country || filters.sources.length > 0 || filters.modelSlugs.length > 0 || filters.period !== '7days') && (
                <button
                    onClick={() => {
                        onFiltersChange({
                            period: '7days',
                            startDate: null,
                            endDate: null,
                            country: null,
                            sources: [],
                            modelSlugs: [],
                        });
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white transition-colors font-medium"
                >
                    <X className="w-4 h-4" />
                    Clear
                </button>
            )}

            {/* Loading Indicator */}
            {isLoading && (
                <div className="ml-2 w-5 h-5 border-2 border-[#7A27FF] border-t-transparent rounded-full animate-spin" />
            )}
        </div>
    );
}
