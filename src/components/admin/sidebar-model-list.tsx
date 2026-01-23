'use client';

import Image from 'next/image';
import { Check, Link2 } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import type { SidebarModel } from '@/types/analytics';

interface SidebarModelListProps {
  models: SidebarModel[];
  selectedSlugs: string[];
  onSelectionChange: (slugs: string[]) => void;
  onManageTrackingLinks?: (model: SidebarModel) => void;
  loading?: boolean;
  className?: string;
}

export function SidebarModelList({
  models,
  selectedSlugs,
  onSelectionChange,
  onManageTrackingLinks,
  loading = false,
  className
}: SidebarModelListProps) {
  const handleSelectAll = () => {
    onSelectionChange(models.map(model => model.slug));
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  const toggleModel = (slug: string) => {
    const newSelection = selectedSlugs.includes(slug)
      ? selectedSlugs.filter(s => s !== slug)
      : [...selectedSlugs, slug];
    onSelectionChange(newSelection);
  };

  const handleRowClick = (slug: string) => {
    toggleModel(slug);
  };

  if (loading) {
    return (
      <div className={cn("bg-card border border-white/10 rounded-xl", className)}>
        {/* Loading skeleton */}
        <div className="p-4 border-b border-white/10">
          <div className="h-6 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/5 rounded animate-pulse" />
                <div className="h-3 bg-white/5 rounded animate-pulse w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border border-white/10 rounded-xl", className)}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-white/10 rounded-t-xl">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-foreground">Models</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-sm font-medium text-[#00FF85] hover:bg-[#00FF85]/10 rounded-lg transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-white/5 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div
        className="overflow-y-auto scrollbar-hidden"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {models.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">No models found</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {models.map((model) => {
              const isSelected = selectedSlugs.includes(model.slug);

              return (
                <div
                  key={model.slug}
                  onClick={() => handleRowClick(model.slug)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                    isSelected
                      ? "border-l-4 border-[#00FF85] bg-[#00FF85]/5"
                      : "hover:bg-white/5 border-l-4 border-transparent"
                  )}
                >
                  {/* Profile Image */}
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                    {model.imageUrl ? (
                      <Image
                        src={getImageUrl(model.imageUrl)}
                        alt={model.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00FF85]/20 to-[#7A27FF]/20 text-xs font-semibold text-[#00FF85]">
                        {model.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate text-sm">
                        {model.name}
                      </h3>
                      {model.isVerified && <VerifiedBadge />}

                      {onManageTrackingLinks && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onManageTrackingLinks(model);
                          }}
                          className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-[#00FF85] transition-colors"
                          title="Manage tracking links"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {model.totalViews.toLocaleString()} views
                    </p>
                  </div>

                  {/* iOS 26 Style Checkbox */}
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleModel(model.slug)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
                      isSelected
                        ? "bg-[#00FF85] border-[#00FF85] shadow-[0_0_12px_rgba(0,255,133,0.3)]"
                        : "bg-white/[0.05] border-white/20 hover:border-white/30"
                    )}>
                      {isSelected && (
                        <Check className="w-3 h-3 text-black" strokeWidth={3} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}