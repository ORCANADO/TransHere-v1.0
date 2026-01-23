import { ReactNode } from 'react';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string | ReactNode;
  icon?: ReactNode;
  accentColor?: 'default' | 'emerald' | 'violet';
  className?: string; // Add className for flexibility
}

export function StatCard({ label, value, subtext, icon, accentColor = 'default', className }: StatCardProps) {
  const { isLightMode } = useAdminTheme();

  return (
    <div
      className={cn(
        // Structure
        "relative overflow-hidden rounded-3xl p-6",
        "transition-all duration-200",

        // === GLASS EFFECT ===
        "backdrop-blur-[24px] saturate-[140%]",

        // === DARK MODE ===
        "bg-gradient-to-br from-[#3C3F40]/85 to-[#353839]/75",
        "border border-[#555D50]/40",
        "shadow-[var(--admin-shadow-ao)]",

        // === DARK MODE HOVER (Violet SSS) ===
        "hover:border-[#555D50]/60",
        "hover:shadow-[0px_1px_2px_rgba(0,0,0,0.4),0px_4px_8px_-2px_rgba(0,0,0,0.3),inset_0_0_20px_4px_rgba(91,73,101,0.3)]",

        // === LIGHT MODE ===
        "data-[theme=light]:bg-gradient-to-br data-[theme=light]:from-white/80 data-[theme=light]:to-[#F9F6EE]/70",
        "data-[theme=light]:border-[#CED9EF]/50",
        "data-[theme=light]:shadow-[var(--admin-shadow-light)]",

        // === LIGHT MODE HOVER (Rose Warm) ===
        "data-[theme=light]:hover:border-[#EFC8DF]/60",
        "data-[theme=light]:hover:shadow-[0px_1px_2px_rgba(0,0,0,0.08),inset_0_0_20px_4px_rgba(239,200,223,0.3)]",

        className
      )}
      data-theme={isLightMode ? 'light' : 'dark'}
    >
      {/* Label Row */}
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span className={cn(
            "text-[#9E9E9E]",
            "data-[theme=light]:text-[#6B6B7B]"
          )} data-theme={isLightMode ? 'light' : 'dark'}>
            {icon}
          </span>
        )}
        <span className={cn(
          "text-xs font-semibold uppercase tracking-[0.08em]",
          "text-[#9E9E9E]",
          "data-[theme=light]:text-[#6B6B7B]"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div className={cn(
        "text-4xl font-bold tracking-tight",
        accentColor === 'emerald' && "text-[#00FF85]",
        accentColor === 'violet' && "text-[#7A27FF]",
        accentColor === 'default' && cn(
          "text-[#E2DFD2]",
          "data-[theme=light]:text-[#2E293A]"
        )
      )} data-theme={isLightMode ? 'light' : 'dark'}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>

      {/* Subtext */}
      {subtext && (
        <div className={cn(
          "text-sm mt-2",
          "text-[#9E9E9E]",
          "data-[theme=light]:text-[#6B6B7B]"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          {subtext}
        </div>
      )}
    </div>
  );
}
