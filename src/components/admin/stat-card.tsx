'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, icon, change, subtitle }: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div className="liquid-glass rounded-xl p-6 glass-depth-1 hover:glass-depth-2 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-white mt-1">
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-white/5 rounded-lg">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-sm",
          change > 0 && "text-[#00FF85]",
          change < 0 && "text-red-400",
          change === 0 && "text-muted-foreground"
        )}>
          {change > 0 && <TrendingUp className="w-4 h-4" />}
          {change < 0 && <TrendingDown className="w-4 h-4" />}
          {change === 0 && <Minus className="w-4 h-4" />}
          <span>{change > 0 ? '+' : ''}{change.toFixed(1)}% vs previous period</span>
        </div>
      )}
    </div>
  );
}
