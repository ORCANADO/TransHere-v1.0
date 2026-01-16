'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import './admin-theme.css';
import { ThemeToggle } from '@/components/admin/theme-toggle';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { useModelSelection } from '@/hooks/use-model-selection';
import { cn } from '@/lib/utils';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';
import { ModelEditor } from '@/components/admin/model-editor';
import { TrackingLinkManager } from '@/app/admin/components/TrackingLinkManager';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import type { Model } from '@/types';


function AdminContent() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key');
  const [mounted, setMounted] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize model selection hook
  const { selectedIds, toggleModel, selectMultiple } = useModelSelection();

  // Initialize theme globally
  useAdminTheme();

  const [models, setModels] = useState<Model[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(true);
  const [isTrackingManagerOpen, setIsTrackingManagerOpen] = useState(false);
  const [trackingModel, setTrackingModel] = useState<{ id: string; name: string; slug: string } | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      setIsModelsLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase.from('models').select('id, name, slug, image_url, is_verified, is_new, is_pinned, tags').order('name');
        if (data) setModels(data as Model[]);
      } finally {
        setIsModelsLoading(false);
      }
    };
    fetchModels();
  }, []);

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
        <div className="bg-card border border-white/10 rounded-xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            Admin key required. Add <code className="bg-white/10 px-2 py-1 rounded">?key=YOUR_KEY</code> to the URL.
          </p>
        </div>
      </div>
    );
  }

  // If editing a model, show the editor
  if (editingModelId || isAddingModel) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#00FF85]" />
            <span className="font-bold text-white">TransHere Admin</span>
            <span className="px-2 py-1 bg-[#7A27FF]/20 text-[#7A27FF] text-xs rounded-full">
              Model Editor
            </span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
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
              // Trigger a re-fetch of models
              const fetchModels = async () => {
                const supabase = createClient();
                const { data } = await supabase.from('models').select('id, name, slug, image_url, is_verified, is_new, is_pinned, tags').order('name');
                if (data) setModels(data as Model[]);
              };
              fetchModels();
            }}
            onModelDeleted={() => {
              setEditingModelId(null);
              setIsAddingModel(false);
              // Trigger a re-fetch of models
              const fetchModels = async () => {
                const supabase = createClient();
                const { data } = await supabase.from('models').select('id, name, slug, image_url, is_verified, is_new, is_pinned, tags').order('name');
                if (data) setModels(data as Model[]);
              };
              fetchModels();
            }}
          />
        </main>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="h-screen bg-background overflow-hidden" suppressHydrationWarning>
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
          onAddModel={() => setIsAddingModel(true)}
          isLoading={isModelsLoading}
        />

        {/* Main Content Area */}
        <main className="h-screen overflow-y-auto relative">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
            <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleCollapse}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <ChevronRight className={cn("w-5 h-5 transition-transform", !isSidebarCollapsed && "rotate-180")} />
                </button>
                <Shield className="w-6 h-6 text-[#00FF85]" />
                <span className="font-bold text-white hidden sm:inline">Analytics Dashboard</span>
              </div>

              <div className="flex items-center gap-4">
                <ThemeToggle showLabels className="hidden md:flex" />
                <ThemeToggle className="md:hidden" />
              </div>
            </div>
          </header>

          {/* Analytics Dashboard - Always Visible */}
          <div className="p-4 lg:p-6">
            <AnalyticsDashboard
              adminKey={adminKey}
              selectedModelIds={selectedIds}
              onModelSelectionChange={selectMultiple}
            />
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#7A27FF] border-t-transparent rounded-full" />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
