'use client';

import { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardContainerProps {
  /** Left sidebar content (model list) */
  sidebar: ReactNode;
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
  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Mobile Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-200 lg:hidden",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onSidebarToggle}
      />

      {/* Desktop Layout: CSS Grid */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr] lg:h-full lg:gap-6">
        {/* Desktop Sidebar: Sticky */}
        <div className="sticky top-0 h-screen overflow-hidden">
          {sidebar}
        </div>

        {/* Desktop Main Content: Scrollable */}
        <div className="h-screen overflow-y-auto">
          {/* Sticky Header & Filters Bar */}
          <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
            {header && (
              <div className="border-b border-white/5">
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
        <div
          className={cn(
            "fixed inset-y-0 left-0 w-[280px] z-50 transform transition-transform duration-300 ease-out bg-background",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebar}
        </div>

        {/* Mobile Main Content */}
        <div className="h-screen overflow-y-auto">
          {/* Mobile Sticky Header & Filters */}
          <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
            {header && (
              <div className="border-b border-white/5">
                {header}
              </div>
            )}
            <div className="flex items-center gap-3 p-4">
              {/* Hamburger Menu Button */}
              <button
                onClick={onSidebarToggle}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 active:scale-95"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5 text-foreground" />
                ) : (
                  <Menu className="w-5 h-5 text-foreground" />
                )}
              </button>

              {/* Filters Content */}
              <div className="flex-1 overflow-x-auto scrollbar-hidden">
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