'use client';

import { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaterialFlux } from '@/hooks/use-material-flux';

interface DashboardContainerProps {
  /** Left sidebar content (model list) */
  sidebar?: ReactNode;
  /** Top header content (branding, theme toggle) */
  header?: ReactNode;
  /** Top filter bar */
  filters: ReactNode;
  /** Main dashboard content */
  children: ReactNode;
  /** Mobile sidebar toggle state */
  sidebarOpen?: boolean;
  /** Mobile sidebar toggle callback */
  onSidebarToggle?: () => void;
}

export function DashboardContainer({
  sidebar,
  header,
  filters,
  children,
  sidebarOpen = false,
  onSidebarToggle,
}: DashboardContainerProps) {
  const fluxRef = useMaterialFlux<HTMLDivElement>();
  return (
    <div className="h-screen bg-[var(--surface-obsidian-void)] liquid-light:bg-[var(--surface-irid-base)] overflow-hidden">
      {/* Mobile Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-200 lg:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onSidebarToggle}
      />

      {/* Desktop Layout: CSS Grid */}
      <div className={cn(
        "hidden lg:grid lg:h-full lg:gap-6",
        sidebar ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1"
      )}>
        {/* Desktop Sidebar: Sticky */}
        {sidebar && (
          <div className="sticky top-0 h-screen overflow-hidden">
            {sidebar}
          </div>
        )}

        {/* Desktop Main Content: Scrollable */}
        <div className="h-screen overflow-y-auto">
          {/* Sticky Header & Filters Bar */}
          <div
            ref={fluxRef}
            className="sticky top-0 z-40 bg-[var(--surface-obsidian-void)]/80 liquid-light:bg-[var(--surface-irid-base)]/80 backdrop-blur-xl border-b border-[var(--border-obsidian-rim)]/10 liquid-light:border-white/20 flux-border"
          >
            {header && (
              <div className="border-b border-[var(--border-obsidian-rim)]/5 liquid-light:border-white/10">
                {header}
              </div>
            )}
            <div className="px-6 py-4">
              {filters}
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Layout: Single Column */}
      <div className="lg:hidden">
        {/* Mobile Sidebar: Slide-over Drawer */}
        {sidebar && (
          <div
            className={cn(
              "fixed inset-y-0 left-0 w-[280px] z-50 transform transition-transform duration-300 ease-out bg-[var(--surface-obsidian-void)] liquid-light:bg-[var(--surface-irid-base)]",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            {sidebar}
          </div>
        )}

        {/* Mobile Main Content */}
        <div className="h-screen overflow-y-auto">
          {/* Mobile Sticky Header & Filters */}
          <div className="sticky top-0 z-40 bg-[var(--surface-obsidian-void)]/80 liquid-light:bg-[var(--surface-irid-base)]/80 backdrop-blur-xl border-b border-[var(--border-obsidian-rim)]/10 liquid-light:border-white/20">
            {header && (
              <div className="border-b border-[var(--border-obsidian-rim)]/5 liquid-light:border-white/10">
                {header}
              </div>
            )}
            <div className={cn(
              "flex items-center gap-3 p-4",
              sidebar ? "" : "justify-center"
            )}>
              {/* Hamburger Menu Button - Only show if sidebar exists */}
              {sidebar && (
                <button
                  onClick={onSidebarToggle}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface-obsidian-glass)]/30 hover:bg-[var(--surface-obsidian-glass)]/50 border border-[var(--border-obsidian-rim)]/20 liquid-light:bg-white/30 liquid-light:hover:bg-white/50 liquid-light:border-white/40 transition-all duration-200 active:scale-95"
                  aria-label="Toggle sidebar"
                >
                  {sidebarOpen ? (
                    <X className="w-5 h-5 text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]" />
                  ) : (
                    <Menu className="w-5 h-5 text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]" />
                  )}
                </button>
              )}

              {/* Filters Content */}
              <div className={cn(
                "overflow-x-auto scrollbar-hidden",
                sidebar ? "flex-1" : "w-full"
              )}>
                {filters}
              </div>
            </div>
          </div>

          {/* Mobile Main Content */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}