'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  loading?: boolean;
}

export function StatCard({ title, value, icon, change, subtitle, className, valueClassName, loading }: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div className={cn(
      "rounded-2xl p-6 transition-all duration-300",
      "bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10",
      "shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[#86868B] dark:text-gray-400 text-sm font-medium">{title}</p>
          <p className={cn(
            "text-2xl lg:text-3xl font-bold mt-1",
            loading ? "opacity-20 animate-pulse" : "opacity-100",
            !valueClassName && "text-[#1D1D1F] dark:text-white",
            valueClassName
          )}>
            {loading ? '0,000' : formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-[#86868B]/80 dark:text-muted-foreground/60 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-black/[0.04] dark:bg-white/5 rounded-xl border border-black/[0.04] dark:border-white/5">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-sm",
          change > 0 && "text-[#34C759]",
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
