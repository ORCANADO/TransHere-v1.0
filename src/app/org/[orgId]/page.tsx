'use client';

export const runtime = 'edge';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState, useCallback, useEffect } from 'react';
import {
    Shield,
    AlertTriangle,
    PanelLeft
} from 'lucide-react';
import './admin-theme.css';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { useModelSelection } from '@/hooks/use-model-selection';
import { cn } from '@/lib/utils';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';
import { ModelEditor } from '@/components/admin/model-editor';
import { TrackingLinkManager } from './components/TrackingLinkManager';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { createClient } from '@/lib/supabase/client';
import type { Model } from '@/types';

function OrgDashboardContent() {
    const params = useParams();
    const orgId = params.orgId as string;
    const searchParams = useSearchParams();
    const apiKey = searchParams.get('key');

    const [mounted, setMounted] = useState(false);
    const [editingModelId, setEditingModelId] = useState<string | null>(null);
    const [isAddingModel, setIsAddingModel] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Initialize model selection hook
    const { selectedIds, toggleModel, selectMultiple } = useModelSelection();

    // Initialize theme 
    useAdminTheme();

    const [models, setModels] = useState<Model[]>([]);
    const [isModelsLoading, setIsModelsLoading] = useState(true);
    const [isTrackingManagerOpen, setIsTrackingManagerOpen] = useState(false);
    const [trackingModel, setTrackingModel] = useState<{ id: string; name: string; slug: string } | null>(null);
    const [modelMetrics, setModelMetrics] = useState<Record<string, { views: number; clicks: number }>>({});

    const handleDataLoaded = useCallback((data: any) => {
        if (data.modelAnalytics) {
            const metricsMap: Record<string, { views: number; clicks: number }> = {};
            data.modelAnalytics.forEach((m: any) => {
                metricsMap[m.modelSlug] = { views: m.visits, clicks: m.clicks };
            });
            setModelMetrics(metricsMap);
        }
    }, []);

    useEffect(() => {
        const fetchModels = async () => {
            if (!orgId) return;
            setIsModelsLoading(true);
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from('models')
                    .select('id, name, slug, image_url, is_verified, is_new, is_pinned, tags')
                    .eq('organization_id', orgId)
                    .order('name');
                if (data) setModels(data as Model[]);
            } finally {
                setIsModelsLoading(false);
            }
        };
        fetchModels();
    }, [orgId]);

    useEffect(() => {
        setMounted(true);
        const savedState = localStorage.getItem('transhere-org-sidebar-collapsed');
        if (savedState) {
            setIsSidebarCollapsed(JSON.parse(savedState));
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
                e.preventDefault();
                handleToggleCollapse();
            }
            if (e.key === 'Escape') {
                setEditingModelId(null);
                setIsAddingModel(false);
                setIsTrackingManagerOpen(false);
            }
        };

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

    const handleToggleCollapse = () => {
        setIsSidebarCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('transhere-org-sidebar-collapsed', JSON.stringify(newState));
            return newState;
        });
    };

    if (!apiKey) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
                    <p className="text-muted-foreground">
                        Organization key required. Add <code className="bg-foreground/10 px-2 py-1 rounded">?key=YOUR_KEY</code> to the URL.
                    </p>
                </div>
            </div>
        );
    }

    if (editingModelId || isAddingModel) {
        return (
            <div className="min-h-screen bg-background">
                <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
                    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-[#00FF85]" />
                        <span className="font-bold text-foreground">Organization Manager</span>
                        <span className="px-2 py-1 bg-[#7A27FF]/20 text-[#7A27FF] text-xs rounded-full">
                            Model Editor
                        </span>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 py-6">
                    <ModelEditor
                        adminKey={apiKey}
                        modelId={editingModelId}
                        onBack={() => {
                            setEditingModelId(null);
                            setIsAddingModel(false);
                        }}
                        onSaved={() => {
                            setEditingModelId(null);
                            setIsAddingModel(false);
                            const fetchModels = async () => {
                                const supabase = createClient();
                                const { data } = await supabase.from('models').select('id, name, slug, image_url, is_verified, is_new, is_pinned, tags').eq('organization_id', orgId).order('name');
                                if (data) setModels(data as Model[]);
                            };
                            fetchModels();
                        }}
                        onModelDeleted={() => {
                            setEditingModelId(null);
                            setIsAddingModel(false);
                            const fetchModels = async () => {
                                const supabase = createClient();
                                const { data } = await supabase.from('models').select('id, name, slug, image_url, is_verified, is_new, is_pinned, tags').eq('organization_id', orgId).order('name');
                                if (data) setModels(data as Model[]);
                            };
                            fetchModels();
                        }}
                        organizationId={orgId}
                    />
                </main>
            </div>
        );
    }

    if (!mounted) return null;

    return (
        <div className="h-screen bg-background overflow-hidden" suppressHydrationWarning>
            <div className={cn(
                "grid h-full transition-all duration-300",
                isSidebarCollapsed ? "lg:grid-cols-[0px_1fr]" : "lg:grid-cols-[280px_1fr]"
            )}>
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

                <main className="h-screen overflow-y-auto relative">
                    {isSidebarCollapsed && (
                        <button
                            onClick={handleToggleCollapse}
                            className={cn(
                                "fixed left-4 top-4 lg:left-6 lg:top-6 z-[60] flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                                "bg-white/80 dark:bg-[#0A1221]/80 backdrop-blur-xl",
                                "border border-border",
                                "shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
                                "hover:scale-110 active:scale-95 group hover:border-[#007AFF]/30 dark:hover:border-[#7A27FF]/30",
                                "flex"
                            )}
                            title="Expand Sidebar (Cmd + \)"
                        >
                            <PanelLeft className="w-5 h-5 text-foreground/60 group-hover:text-[#007AFF] dark:group-hover:text-[#7A27FF] transition-colors" />
                        </button>
                    )}

                    <div className="p-4 lg:p-6">
                        <div className="flex items-center gap-2 mb-6 border-b border-border">
                            <div className="px-4 py-2.5 font-semibold text-sm text-[#007AFF] dark:text-[#7A27FF] relative cursor-default">
                                Analytics
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF] dark:bg-[#7A27FF]" />
                            </div>
                            <a
                                href={`/org/${orgId}/models?key=${apiKey}`}
                                className="px-4 py-2.5 font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Models
                            </a>
                            <a
                                href={`/org/${orgId}/tracking?key=${apiKey}`}
                                className="px-4 py-2.5 font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Tracking Links
                            </a>
                        </div>

                        <AnalyticsDashboard
                            adminKey={apiKey}
                            selectedModelIds={selectedIds}
                            onModelSelectionChange={selectMultiple}
                            onDataLoaded={handleDataLoaded}
                            isSidebarCollapsed={isSidebarCollapsed}
                            endpoint="/api/org/analytics"
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
                    adminKey={apiKey}
                />
            )}
        </div>
    );
}

export default function OrgDashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#7A27FF] border-t-transparent rounded-full" />
            </div>
        }>
            <OrgDashboardContent />
        </Suspense>
    );
}
