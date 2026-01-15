// ============================================
// TRANSHERE v1.1 - MODEL ANALYTICS CARD
// With Selection Support for Comparison Charts
// ============================================

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Globe, Image as ImageIcon, Check } from 'lucide-react';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ModelAnalytics {
  modelSlug: string;
  modelName: string;
  imageUrl: string | null;
  visits: number;
  clicks: number;
  conversionRate: number;
  topCountries: { country: string; count: number }[];
  dailyData: { date: string; views: number; clicks: number }[];
}

interface ModelAnalyticsCardProps {
  model: ModelAnalytics;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function ModelAnalyticsCard({
  model,
  isSelected = false,
  onToggleSelect,
}: ModelAnalyticsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        "liquid-glass rounded-xl overflow-hidden transition-all duration-200",
        isSelected && "ring-2 ring-[#7A27FF] shadow-lg shadow-[#7A27FF]/10"
      )}
    >
      {/* Header - Always visible */}
      <div className="flex items-center">
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={cn(
              "flex items-center justify-center w-12 h-full border-r transition-colors",
              isSelected
                ? "bg-[#7A27FF]/20 border-[#7A27FF]/30"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            )}
            aria-label={isSelected ? "Remove from comparison" : "Add to comparison"}
          >
            <div className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              isSelected
                ? "bg-[#7A27FF] border-[#7A27FF]"
                : "border-white/30 hover:border-white/50"
            )}>
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>
        )}

        {/* Expandable Content */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}

            {/* Profile Picture */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/5 flex-shrink-0 border-2 border-white/20">
              {model.imageUrl ? (
                <Image
                  src={getImageUrl(model.imageUrl)}
                  alt={model.modelName}
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="text-left">
              <h4 className="font-semibold text-foreground">{model.modelName}</h4>
              <p className="text-xs text-muted-foreground">@{model.modelSlug}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Views</p>
              <p className="font-semibold text-[#7A27FF]">{model.visits.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Clicks</p>
              <p className="font-semibold text-[#00FF85]">{model.clicks.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">CTR</p>
              <p className="font-semibold text-foreground">{model.conversionRate.toFixed(1)}%</p>
            </div>
          </div>
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* Top Countries */}
          <div>
            <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Top Countries
            </h5>
            <div className="flex flex-wrap gap-2">
              {model.topCountries.length > 0 ? (
                model.topCountries.map(({ country, count }) => (
                  <span
                    key={country}
                    className="px-3 py-1 bg-white/5 rounded-full text-sm text-foreground"
                  >
                    {country}: {count}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">No country data</span>
              )}
            </div>
          </div>

          {/* Daily breakdown */}
          <div>
            <h5 className="text-sm font-medium text-muted-foreground mb-2">
              Daily Breakdown (Last 7 Days)
            </h5>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-white/10">
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Views</th>
                    <th className="text-right py-2">Clicks</th>
                    <th className="text-right py-2">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {model.dailyData.slice(-7).reverse().map((day) => (
                    <tr key={day.date} className="border-b border-white/5">
                      <td className="py-2 text-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-2 text-right text-[#7A27FF]">{day.views}</td>
                      <td className="py-2 text-right text-[#00FF85]">{day.clicks}</td>
                      <td className="py-2 text-right text-foreground">
                        {day.views > 0 ? ((day.clicks / day.views) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 pt-2">
            <a
              href={`/model/${model.modelSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#7A27FF]/20 text-[#7A27FF] rounded-lg text-sm hover:bg-[#7A27FF]/30 transition-colors"
            >
              View Profile →
            </a>
            {isSelected && (
              <span className="px-4 py-2 bg-[#7A27FF]/10 text-[#7A27FF] rounded-lg text-sm">
                ✓ Added to comparison
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
