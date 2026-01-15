// ============================================
// TRANSHERE v1.1 - DASHBOARD FILTERS COMPONENT
// Comprehensive Filter Bar with Multi-Select Support
// ============================================

'use client';

import { useState, useCallback } from 'react';
import {
    Calendar,
    Globe,
    Link2,
    Users,
    X,
    ChevronDown,
    Check,
    Search
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
                    <div className="absolute top-full mt-2 z-50 min-w-[200px] max-h-[400px] overflow-auto liquid-glass-elevated rounded-xl shadow-2xl">
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

    const toggleModel = useCallback((slug: string) => {
        if (selectedSlugs.includes(slug)) {
            onChange(selectedSlugs.filter(s => s !== slug));
        } else {
            onChange([...selectedSlugs, slug]);
        }
    }, [selectedSlugs, onChange]);

    const clearAll = useCallback(() => {
        onChange([]);
        setSearchQuery('');
    }, [onChange]);

    const selectAll = useCallback(() => {
        onChange(filteredModels.map(m => m.slug));
    }, [filteredModels, onChange]);

    return (
        <FilterDropdown
            trigger={
                <>
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                        {selectedSlugs.length === 0
                            ? 'All Models'
                            : `${selectedSlugs.length} Model${selectedSlugs.length > 1 ? 's' : ''}`
                        }
                    </span>
                    {selectedSlugs.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#7A27FF] text-white rounded-full">
                            {selectedSlugs.length}
                        </span>
                    )}
                </>
            }
            isOpen={isOpen}
            onToggle={onToggle}
            className="min-w-[160px]"
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
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <button
                    onClick={clearAll}
                    className="text-xs text-[#00FF85] hover:underline"
                >
                    Clear all
                </button>
                <button
                    onClick={selectAll}
                    className="text-xs text-[#7A27FF] hover:underline"
                >
                    Select all
                </button>
            </div>

            {/* Model List */}
            <div className="max-h-[300px] overflow-y-auto">
                {filteredModels.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No models found
                    </div>
                ) : (
                    filteredModels.map((model) => (
                        <label
                            key={model.slug}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                            {/* Checkbox */}
                            <div className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                selectedSlugs.includes(model.slug)
                                    ? "bg-[#7A27FF] border-[#7A27FF]"
                                    : "border-white/30 hover:border-white/50"
                            )}>
                                {selectedSlugs.includes(model.slug) && (
                                    <Check className="w-3 h-3 text-white" />
                                )}
                            </div>

                            {/* Model Avatar */}
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                                {model.imageUrl ? (
                                    <Image
                                        src={getImageUrl(model.imageUrl)}
                                        alt={model.name}
                                        width={32}
                                        height={32}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                        {model.name.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Model Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                    {model.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    @{model.slug}
                                </p>
                            </div>
                        </label>
                    ))
                )}
            </div>
        </FilterDropdown>
    );
}

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

    // Get selected source name
    const selectedSourceName = filters.sourceId
        ? availableSources.find(s => s.id === filters.sourceId)?.name
        : null;

    // Get selected subtag name
    const selectedSubtagName = filters.subtagId
        ? availableSources
            .flatMap(s => s.subtags || [])
            .find(st => st.id === filters.subtagId)?.name
        : null;

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
                            onClick={() => {
                                updateFilter('period', period.value);
                                if (period.value !== 'custom') {
                                    updateFilter('startDate', null);
                                    updateFilter('endDate', null);
                                }
                                closeDropdowns();
                            }}
                            className={cn(
                                "w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors",
                                filters.period === period.value
                                    ? "text-[#00FF85] font-medium"
                                    : "text-foreground"
                            )}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>

                {/* Custom Date Range */}
                {filters.period === 'custom' && (
                    <div className="p-3 border-t border-white/10 space-y-2">
                        <DatePicker
                            value={filters.startDate || ''}
                            onChange={(date) => updateFilter('startDate', date || null)}
                            placeholder="Start date"
                            max={filters.endDate || undefined}
                        />
                        <DatePicker
                            value={filters.endDate || ''}
                            onChange={(date) => updateFilter('endDate', date || null)}
                            placeholder="End date"
                            min={filters.startDate || undefined}
                        />
                    </div>
                )}
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
                onToggle={() => toggleDropdown('country')}
                className="min-w-[140px]"
            >
                <div className="py-1 max-h-[300px] overflow-y-auto">
                    <button
                        onClick={() => {
                            updateFilter('country', null);
                            closeDropdowns();
                        }}
                        className={cn(
                            "w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors",
                            !filters.country ? "text-[#00FF85] font-medium" : "text-foreground"
                        )}
                    >
                        All Countries
                    </button>
                    {availableCountries.map((country) => (
                        <button
                            key={country}
                            onClick={() => {
                                updateFilter('country', country);
                                closeDropdowns();
                            }}
                            className={cn(
                                "w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors",
                                filters.country === country
                                    ? "text-[#00FF85] font-medium"
                                    : "text-foreground"
                            )}
                        >
                            {country}
                        </button>
                    ))}
                </div>
            </FilterDropdown>

            {/* Traffic Source Filter */}
            <FilterDropdown
                trigger={
                    <>
                        <Link2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
                            {selectedSubtagName || selectedSourceName || 'All Sources'}
                        </span>
                    </>
                }
                isOpen={openDropdown === 'source'}
                onToggle={() => toggleDropdown('source')}
                className="min-w-[150px]"
            >
                <div className="py-1 max-h-[400px] overflow-y-auto">
                    {/* All Sources Option */}
                    <button
                        onClick={() => {
                            updateFilter('sourceId', null);
                            updateFilter('subtagId', null);
                            closeDropdowns();
                        }}
                        className={cn(
                            "w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors",
                            !filters.sourceId ? "text-[#00FF85] font-medium" : "text-foreground"
                        )}
                    >
                        All Sources
                    </button>

                    {/* Source List with Subtags */}
                    {availableSources.map((source) => (
                        <div key={source.id}>
                            {/* Parent Source */}
                            <button
                                onClick={() => {
                                    updateFilter('sourceId', source.id);
                                    updateFilter('subtagId', null);
                                    closeDropdowns();
                                }}
                                className={cn(
                                    "w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors",
                                    filters.sourceId === source.id && !filters.subtagId
                                        ? "text-[#00FF85] font-medium"
                                        : "text-foreground"
                                )}
                            >
                                {source.name}
                            </button>

                            {/* Subtags (indented) */}
                            {source.subtags && source.subtags.length > 0 && (
                                <div className="pl-4">
                                    {source.subtags.map((subtag) => (
                                        <button
                                            key={subtag.id}
                                            onClick={() => {
                                                updateFilter('sourceId', source.id);
                                                updateFilter('subtagId', subtag.id);
                                                closeDropdowns();
                                            }}
                                            className={cn(
                                                "w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors",
                                                filters.subtagId === subtag.id
                                                    ? "text-[#7A27FF] font-medium"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            └ {subtag.name}
                                        </button>
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
            {(filters.country || filters.sourceId || filters.modelSlugs.length > 0 || filters.period !== '7days') && (
                <button
                    onClick={() => {
                        onFiltersChange({
                            period: '7days',
                            startDate: null,
                            endDate: null,
                            country: null,
                            sourceId: null,
                            subtagId: null,
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
