'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMaterialFlux } from '@/hooks/use-material-flux';

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

  const fluxRef = useMaterialFlux<HTMLDivElement>();

  return (
    <div
      ref={fluxRef}
      className={cn(
        "rounded-2xl p-6 transition-all duration-300",
        // Medium Glass Physics
        "backdrop-blur-[var(--blur-medium)] saturate-[140%]",
        // Obsidian Surface
        "bg-[var(--surface-obsidian-glass)]/60",
        // AO Shadow Stack
        "shadow-[var(--shadow-ao-stack)]",
        // Super-Ellipse
        "rounded-[var(--radius-squircle-sm)]",
        "border border-[var(--border-obsidian-rim)]/30",
        // SSS Internal Glow on Hover
        "hover:shadow-[inset_0_0_20px_4px_var(--glow-obsidian-internal)]",
        "hover:scale-[1.01] active:scale-[0.99]",
        // Light Mode
        "liquid-light:bg-[var(--surface-irid-glass)]",
        "liquid-light:border-white/60",
        "liquid-light:shadow-[var(--shadow-ao-light)]",
        "liquid-light:hover:shadow-[inset_0_0_20px_4px_var(--glow-irid-warm)]",
        // Material Flux
        "flux-border",
        className
      )}>
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <p className={cn(
            "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 text-sm font-bold",
            "[font-variation-settings:'opsz'_18,'wdth'_110]"
          )}>{title}</p>
          <p className={cn(
            "text-2xl lg:text-3xl font-bold mt-1 tabular-nums",
            loading ? "opacity-20 animate-pulse" : "opacity-100",
            !valueClassName && "text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]",
            valueClassName
          )}>
            {loading ? '0,000' : formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-[var(--text-obsidian-muted)]/60 liquid-light:text-[var(--text-irid-primary)]/50 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-[var(--surface-obsidian-glass)]/40 liquid-light:bg-[var(--surface-irid-glass)] rounded-xl border border-[var(--border-obsidian-rim)]/20 liquid-light:border-white/40 shadow-sm">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-sm",
          change > 0 && "text-accent-emerald font-bold",
          change < 0 && "text-accent-red font-bold",
          change === 0 && "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60"
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
