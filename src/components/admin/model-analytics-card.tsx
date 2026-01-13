'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Globe } from 'lucide-react';
import type { ModelAnalytics } from '@/types/analytics';

interface ModelAnalyticsCardProps {
  model: ModelAnalytics;
}

export function ModelAnalyticsCard({ model }: ModelAnalyticsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-card border border-white/10 rounded-xl overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
          <div className="text-left">
            <h4 className="font-semibold text-white">{model.modelName}</h4>
            <p className="text-xs text-muted-foreground">/{model.modelSlug}</p>
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
            <p className="font-semibold text-white">{model.conversionRate.toFixed(1)}%</p>
          </div>
        </div>
      </button>
      
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
                    className="px-3 py-1 bg-white/5 rounded-full text-sm text-white"
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
              Daily Breakdown
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
                      <td className="py-2 text-white">
                        {new Date(day.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td className="py-2 text-right text-[#7A27FF]">{day.visits}</td>
                      <td className="py-2 text-right text-[#00FF85]">{day.clicks}</td>
                      <td className="py-2 text-right text-white">
                        {day.visits > 0 ? ((day.clicks / day.visits) * 100).toFixed(1) : 0}%
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
          </div>
        </div>
      )}
    </div>
  );
}
