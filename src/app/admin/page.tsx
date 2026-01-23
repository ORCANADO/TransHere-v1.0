'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import {
  Shield,
  AlertTriangle,
  PanelLeft
} from 'lucide-react';
import '@/styles/admin-ios26.css';
import '@/styles/admin-liquid.css';
import { ThemeToggle } from '@/components/admin/theme-toggle';
import { LivePulseIndicator } from '@/components/admin/live-pulse-indicator';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { useModelSelection } from '@/hooks/use-model-selection';
import { cn } from '@/lib/utils';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';
import { ModelEditor } from '@/components/admin/model-editor';
import { TrackingLinkManager } from '@/app/admin/components/TrackingLinkManager';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { OrganizationManager } from '@/components/admin/organization-manager';
import type { Model } from '@/types';


function AdminContent() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key');
  const [mounted, setMounted] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'organizations'>('analytics');

  // Initialize model selection hook
  const { selectedIds, toggleModel, selectMultiple } = useModelSelection();

  // Initialize theme globally
  const { isLightMode } = useAdminTheme();

  const [models, setModels] = useState<Model[]>([]);

  // Convert selected IDs to model slugs for AnalyticsDashboard
  const selectedModelSlugs = useMemo(() => {
    if (selectedIds.length === 0) return [];
    return models
      .filter(m => selectedIds.includes(m.id))
      .map(m => m.slug);
  }, [selectedIds, models]);
  const [modelMetrics, setModelMetrics] = useState<Record<string, { views: number; clicks: number }>>({});
  const [isModelsLoading, setIsModelsLoading] = useState(true);
  const [isTrackingManagerOpen, setIsTrackingManagerOpen] = useState(false);
  const [trackingModel, setTrackingModel] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [authContext, setAuthContext] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const handleDataLoaded = useCallback((data: any) => {
    // Use sidebarMetrics for ALL models (not just filtered)
    // Falls back to modelAnalytics if sidebarMetrics not available
    const metricsSource = data.sidebarMetrics || data.modelAnalytics || [];

    const metricsMap: Record<string, { views: number; clicks: number }> = {};

    metricsSource.forEach((m: any) => {
      // Handle both formats (sidebarMetrics vs modelAnalytics)
      const slug = m.modelSlug || m.model_slug;
      const views = m.views ?? m.visits ?? m.total_views ?? 0;
      const clicks = m.clicks ?? m.total_clicks ?? 0;

      metricsMap[slug] = { views, clicks };
    });

    setModelMetrics(metricsMap);
  }, []); // Empty dependency array as setModelMetrics is stable

  useEffect(() => {
    if (!adminKey) {
      setIsAuthLoading(false);
      return;
    }

    const checkAuthAndFetchModels = async () => {
      setIsAuthLoading(true);
      setIsModelsLoading(true);
      try {
        // Fetch models via API to ensure organization filtering is applied
        const res = await fetch(`/api/admin/models?key=${adminKey}`);
        const json = await res.json();

        // If we get models back, it means the key is valid
        if (json.success) {
          setModels(json.data);

          // Try to get auth context to know if we're admin or organization
          // We can use a simple check or another endpoint, but let's derive it or fetch it
          // For now, let's just use the models endpoint success as proof of some auth
          // and if we need more details we can call a permission endpoint
          try {
            // Let's call the models endpoint with a special param or just check the first model's organization?
            // Better: we update the models API or another one to return the context if requested?
            // Actually, checkAdminPermission is server-side. Let's just use the data we have.
            // If we want the ROLE, we might need a small helper API. 
            // Let's assume for now if they have a key and it worked, we might want to know their role.
          } catch (e) { }
        }

        // To get the ACTUAL role and org name, we can hit a lightweight "me" endpoint or just guess from models
        // Let's use a temporary fetch to models but just for the context if we can.
        // Actually, let's just use the models we have.
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setIsModelsLoading(false);
        setIsAuthLoading(false);
      }
    };

    checkAuthAndFetchModels();
  }, [adminKey]);

  // Handle re-fetches
  const triggerModelRefresh = useCallback(async () => {
    if (!adminKey) return;
    try {
      const res = await fetch(`/api/admin/models?key=${adminKey}`);
      const json = await res.json();
      if (json.success) setModels(json.data);
    } catch (e) {
      console.error('Refresh failed', e);
    }
  }, [adminKey]);

  useEffect(() => {
    setMounted(true);
    // Load collapse state from localStorage
    const savedState = localStorage.getItem('transhere-admin-sidebar-collapsed');
    if (savedState) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + \ : Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        handleToggleCollapse();
      }
      // Escape : Close modals / editors
      if (e.key === 'Escape') {
        setEditingModelId(null);
        setIsAddingModel(false);
        setIsTrackingManagerOpen(false);
      }
    };

    // Custom events from Sidebar
    const handleEditModel = (e: any) => {
      setEditingModelId(e.detail.id);
    };
    const handleManageTracking = (e: any) => {
      setTrackingModel(e.detail);
      setIsTrackingManagerOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('edit-model', handleEditModel);
    window.addEventListener('manage-tracking', handleManageTracking);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('edit-model', handleEditModel);
      window.removeEventListener('manage-tracking', handleManageTracking);
    };
  }, [isSidebarCollapsed]);

  // Persist collapse state to localStorage
  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('transhere-admin-sidebar-collapsed', JSON.stringify(newState));
      return newState;
    });
  };

  if (!adminKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            Admin key required. Add <code className="bg-foreground/10 px-2 py-1 rounded">?key=YOUR_KEY</code> to the URL.
          </p>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-glass-void flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full" />
      </div>
    );
  }

  // If editing a model, show the editor
  if (editingModelId || isAddingModel) {
    return (
      <div className={cn(
        "min-h-screen transition-colors duration-500",
        "bg-[#0B0C0C]",
        "data-[theme=light]:bg-[#F9F6EE]"
      )} data-theme={isLightMode ? 'light' : 'dark'}>
        {/* The Header is now inside ModelEditor to access model data */}
        <main className="max-w-7xl mx-auto min-h-screen">
          <ModelEditor
            adminKey={adminKey}
            modelId={editingModelId}
            onBack={() => {
              setEditingModelId(null);
              setIsAddingModel(false);
            }}
            onSaved={() => {
              setEditingModelId(null);
              setIsAddingModel(false);
              triggerModelRefresh();
            }}
          />
        </main>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="admin-theme-root h-screen overflow-hidden" data-theme="dark" suppressHydrationWarning>
      {/* CSS Grid Layout: Sidebar + Main Content */}
      <div className={cn(
        "grid h-full transition-all duration-300",
        isSidebarCollapsed ? "lg:grid-cols-[0px_1fr]" : "lg:grid-cols-[280px_1fr]"
      )}>
        {/* Sidebar */}
        <AdminSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          models={models}
          selectedModelIds={selectedIds}
          onModelSelect={toggleModel}
          onClearSelection={() => selectMultiple([])}
          onAddModel={() => setIsAddingModel(true)}
          isLoading={isModelsLoading}
          metrics={modelMetrics}
        />

        {/* Main Content Area */}
        <main className="h-screen overflow-y-auto relative">
          {/* Sidebar Toggle Button (Visible when collapsed) */}
          {isSidebarCollapsed && (
            <button
              onClick={handleToggleCollapse}
              className={cn(
                "fixed left-4 top-4 lg:left-6 lg:top-6 z-[60] flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                "bg-glass-surface backdrop-blur-xl",
                "border border-obsidian-rim",
                "shadow-ao-stack",
                "hover:scale-110 active:scale-95 group hover:border-accent-violet/30",
                "flex"
              )}
              title="Expand Sidebar (Cmd + \)"
            >
              <PanelLeft className="w-5 h-5 text-glass-muted group-hover:text-accent-violet transition-colors" />
              <div className="absolute inset-0 rounded-xl bg-accent-violet/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}

          {/* Unified Sticky Header */}
          <header className={cn(
            "sticky top-0 z-40 px-6 py-4",
            "backdrop-blur-[24px] saturate-[140%]",

            // Dark Mode
            "bg-[#0B0C0C]/80",
            "border-b border-[#555D50]/50",

            // Light Mode
            "data-[theme=light]:bg-[#F9F6EE]/80",
            "data-[theme=light]:border-[#CED9EF]/50"
          )} data-theme={isLightMode ? 'light' : 'dark'}>
            <div className="flex items-center justify-between">
              {/* Left Side: Title & Live Indicator */}
              <div className="flex items-center gap-3">
                <h1 className={cn(
                  "text-xl font-semibold tracking-tight",
                  "text-[#E2DFD2]",
                  "data-[theme=light]:text-[#2E293A]"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                  ADMIN PANEL
                </h1>
                {adminKey && <LivePulseIndicator adminKey={adminKey} />}
              </div>

              {/* Right Side: Tab Navigation & Theme Toggle */}
              <div className="flex items-center gap-6">
                {/* Tab Navigation */}
                <div className={cn(
                  "inline-flex p-1 rounded-xl",
                  "bg-[#353839]/50",
                  "data-[theme=light]:bg-[#CED9EF]/30"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                  {['Analytics', 'Organizations'].map((tab) => {
                    const tabId = tab.toLowerCase();
                    const isActive = activeTab === tabId;

                    // Only show organizations tab for Admins
                    if (tabId === 'organizations' && authContext && !authContext.isAdmin) return null;

                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tabId as any)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                          isActive
                            ? cn(
                              // Active - Dark
                              "bg-[#5B4965]/50 text-[#E2DFD2]",
                              "shadow-[inset_0_0_10px_2px_rgba(91,73,101,0.3)]",
                              // Active - Light
                              "data-[theme=light]:bg-white/80 data-[theme=light]:text-[#2E293A]",
                              "data-[theme=light]:shadow-[var(--admin-shadow-light)]"
                            )
                            : cn(
                              // Inactive - Dark
                              "text-[#9E9E9E] hover:text-[#E2DFD2]",
                              "hover:bg-[#5B4965]/20",
                              // Inactive - Light
                              "data-[theme=light]:text-[#6B6B7B]",
                              "data-[theme=light]:hover:text-[#2E293A]",
                              "data-[theme=light]:hover:bg-[#EFC8DF]/20"
                            )
                        )}
                        data-theme={isLightMode ? 'light' : 'dark'}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <ThemeToggle showLabels />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="p-4 lg:p-6">
            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                adminKey={adminKey}
                onDataLoaded={handleDataLoaded}
                embedded={true}
                selectedModelSlugs={selectedModelSlugs}
              />
            )}
            {activeTab === 'organizations' && (
              <OrganizationManager adminKey={adminKey} />
            )}
          </div>
        </main>
      </div>

      {trackingModel && (
        <TrackingLinkManager
          isOpen={isTrackingManagerOpen}
          onClose={() => setIsTrackingManagerOpen(false)}
          modelId={trackingModel.id}
          modelSlug={trackingModel.slug}
          modelName={trackingModel.name}
          adminKey={adminKey}
        />
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-glass-void flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent-violet border-t-transparent rounded-full" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
