// ============================================
// TRANSHERE v1.1 - DASHBOARD FILTERS COMPONENT
// Comprehensive Filter Bar with Multi-Select Support
// ============================================

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
    availableModels: ModelFilterOption[];
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
}: {
    trigger: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    "liquid-glass-button transition-all duration-200",
                    isOpen && "ring-2 ring-[#7A27FF]/50",
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
                    <div className="absolute top-full mt-2 z-[60] min-w-[200px] max-h-[400px] overflow-auto liquid-glass-elevated rounded-xl shadow-2xl">
                        {children}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Model Multi-Select Component
 */
function ModelMultiSelect({
    selectedSlugs,
    availableModels,
    onChange,
    isOpen,
    onToggle,
}: {
    selectedSlugs: string[];
    availableModels: ModelFilterOption[];
    onChange: (slugs: string[]) => void;
    isOpen: boolean;
    onToggle: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredModels = availableModels.filter(model =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleModelToggle = useCallback((slug: string) => {
        if (selectedSlugs.includes(slug)) {
            onChange(selectedSlugs.filter(s => s !== slug));
        } else {
            onChange([...selectedSlugs, slug]);
        }
    }, [selectedSlugs, onChange]);

    return (
        <FilterDropdown
            trigger={
                <>
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                        Models {selectedSlugs.length > 0 && `(${selectedSlugs.length})`}
                    </span>
                </>
            }
            isOpen={isOpen}
            onToggle={onToggle}
            className="min-w-[200px]"
        >
            {/* Search Input */}
            <div className="p-2 border-b border-white/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search models..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7A27FF]/50"
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 px-3 py-2 border-b border-white/10 mb-2">
                <button
                    onClick={() => onChange(availableModels.map(m => m.slug))}
                    className="text-xs text-[#00FF85] hover:underline"
                >
                    Select All
                </button>
                <span className="text-white/30">|</span>
                <button
                    onClick={() => {
                        onChange([]);
                        setSearchQuery('');
                    }}
                    className="text-xs text-white/60 hover:text-white"
                >
                    Clear
                </button>
            </div>

            {/* Model List */}
            <div className="max-h-[300px] overflow-y-auto px-1">
                {filteredModels.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No models found
                    </div>
                ) : (
                    filteredModels.map((model) => (
                        <div
                            key={model.slug}
                            onClick={() => handleModelToggle(model.slug)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors mb-1",
                                selectedSlugs.includes(model.slug)
                                    ? "bg-[#00FF85]/20 text-[#00FF85]"
                                    : "hover:bg-white/10"
                            )}
                        >
                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                                {model.imageUrl ? (
                                    <Image
                                        src={getImageUrl(model.imageUrl)}
                                        alt={model.name}
                                        width={24}
                                        height={24}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                                        {model.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <span className="text-sm truncate select-none">{model.name}</span>
                            {selectedSlugs.includes(model.slug) && (
                                <Check className="w-4 h-4 ml-auto text-[#00FF85]" />
                            )}
                        </div>
                    ))
                )}
            </div>
        </FilterDropdown>
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
    availableModels,
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
            ? source.subtags.filter(st => st !== subtagName)
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
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
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
                                "w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors cursor-pointer",
                                filters.period === period.value
                                    ? "text-[#00FF85] font-medium"
                                    : "text-foreground"
                            )}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>

                {/* Always show Custom Date Range if available in state or just below */}
                <div className="p-3 border-t border-white/10 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-1 mb-1">Custom Range</p>
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
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
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
                <div className="flex flex-col max-h-[400px]">
                    {/* Search Input */}
                    <div className="p-2 border-b border-white/10 sticky top-0 bg-[#0A1221] z-10">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search countries..."
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                className="w-full pl-7 pr-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded text-white placeholder:text-white/40 focus:outline-none focus:border-[#00FF85]/50"
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
                                "w-full px-4 py-2 text-left text-sm transition-colors block",
                                !filters.country
                                    ? "bg-[#00FF85]/20 text-[#00FF85]"
                                    : "text-foreground hover:bg-white/10"
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
                                        "w-full px-4 py-2 text-left text-sm transition-colors block",
                                        filters.country === country
                                            ? "bg-[#00FF85]/20 text-[#00FF85]"
                                            : "text-foreground hover:bg-white/10"
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
                        <Link2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
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
                            "w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors rounded-md mb-2",
                            filters.sources.length === 0 ? "text-[#00FF85] font-medium" : "text-foreground"
                        )}
                    >
                        All Sources
                    </button>

                    {/* Source List with Subtags */}
                    {TRAFFIC_SOURCES_WITH_ICONS.map((source) => (
                        <div key={source.name} className="mb-1">
                            <div
                                onClick={() => handleSourceToggle(source.name)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors",
                                    isSourceSelected(source.name)
                                        ? "bg-[#7A27FF]/20 text-[#7A27FF]"
                                        : "hover:bg-white/10"
                                )}
                            >
                                <source.icon className="w-4 h-4" />
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
                                                "px-2 py-1.5 text-xs cursor-pointer rounded transition-colors flex items-center justify-between",
                                                isSubtagSelected(source.name, subtag)
                                                    ? "bg-[#7A27FF]/10 text-[#7A27FF]"
                                                    : "text-white/60 hover:text-white"
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
                    ))}
                </div>
            </FilterDropdown>

            {/* Model Filter (Multi-Select) */}
            <ModelMultiSelect
                selectedSlugs={filters.modelSlugs}
                availableModels={availableModels}
                onChange={(slugs) => updateFilter('modelSlugs', slugs)}
                isOpen={openDropdown === 'models'}
                onToggle={() => toggleDropdown('models')}
            />

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
                    className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
