'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  BarChart3,
  Users,
  Upload,
  Settings,
  Link2
} from 'lucide-react';
import './admin-theme.css';
import { ThemeToggle } from '@/components/admin/theme-toggle';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { cn } from '@/lib/utils';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';
import { ModelList } from '@/components/admin/model-list';
import { ModelEditor } from '@/components/admin/model-editor';
import { TrackingLinkManager } from '@/app/admin/components/TrackingLinkManager';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

type Tab = 'analytics' | 'models' | 'tracking' | 'upload' | 'settings';

function AdminContent() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key');
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [mounted, setMounted] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [isAddingModel, setIsAddingModel] = useState(false);

  // Initialize theme globally
  useAdminTheme();

  const [models, setModels] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isTrackingManagerOpen, setIsTrackingManagerOpen] = useState(false);
  const [trackingModel, setTrackingModel] = useState<{ id: string; name: string; slug: string } | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('models').select('id, name, slug').order('name');
      if (data) setModels(data);
    };
    fetchModels();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'models', label: 'Models', icon: Users },
    { id: 'tracking', label: 'Tracking Links', icon: Link2 },
    { id: 'upload', label: 'Quick Upload', icon: Upload },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
            }}
          />
        </main>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#00FF85]" />
              <span className="font-bold text-white">TransHere Admin</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-[#7A27FF] text-white"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'analytics' && (
          <AnalyticsDashboard adminKey={adminKey} />
        )}

        {activeTab === 'models' && (
          <ModelList
            adminKey={adminKey}
            onEditModel={(id) => setEditingModelId(id)}
            onAddModel={() => setIsAddingModel(true)}
          />
        )}

        {activeTab === 'tracking' && (
          <div className="bg-card border border-white/10 rounded-xl p-6 liquid-glass">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Tracking Link Management</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage attribution links and traffic sources for all models.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between liquid-glass-elevated"
                >
                  <div>
                    <h3 className="font-medium text-white">{model.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">/{model.slug}</p>
                  </div>
                  <button
                    onClick={() => {
                      setTrackingModel(model);
                      setIsTrackingManagerOpen(true);
                    }}
                    className="mt-4 w-full py-2 bg-[#7A27FF]/20 text-[#7A27FF] border border-[#7A27FF]/30 rounded-lg hover:bg-[#7A27FF]/30 transition-colors text-sm font-medium"
                  >
                    Manage Links
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="text-center py-20 text-muted-foreground">
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Quick Upload functionality</p>
            <p className="text-sm mt-2">
              Use the Models tab to upload content for specific models
            </p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Appearance Section */}
            <div className="bg-card border border-white/10 rounded-xl p-6 liquid-glass">
              <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>

              <div className="space-y-6">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Dashboard Theme</p>
                    <p className="text-sm text-muted-foreground">
                      Switch between dark and light modes. Light mode uses iOS 26 liquid glass aesthetic.
                    </p>
                  </div>

                  <ThemeToggle showLabels />
                </div>

                {/* Theme Preview */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-muted-foreground mb-3">Preview</p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Dark Preview */}
                    <div className="p-4 rounded-xl bg-[#050A14] border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#00FF85]" />
                        <span className="text-xs text-white/60">Dark Mode</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 w-3/4 rounded bg-white/20" />
                        <div className="h-2 w-1/2 rounded bg-white/10" />
                      </div>
                    </div>

                    {/* Light Preview */}
                    <div className="p-4 rounded-xl bg-[#F5F7FA] border border-black/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#7A27FF]" />
                        <span className="text-xs text-black/60">Light Mode</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 w-3/4 rounded bg-black/20" />
                        <div className="h-2 w-1/2 rounded bg-black/10" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Info Section */}
            <div className="bg-card border border-white/10 rounded-xl p-6 liquid-glass">
              <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium text-white">1.1.0</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Environment</p>
                  <p className="font-medium text-white">Production</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Database</p>
                  <p className="font-medium text-[#00FF85]">Connected</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Storage</p>
                  <p className="font-medium text-[#00FF85]">Cloudflare R2</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Analytics</p>
                  <p className="font-medium text-[#00FF85]">Partitioned Tables</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tracking</p>
                  <p className="font-medium text-[#00FF85]">v1.1 Active</p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-card border border-red-500/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">Refresh Analytics Cache</p>
                    <p className="text-sm text-muted-foreground">
                      Force refresh of materialized views (hourly & daily stats)
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Refresh all analytics views? This may take a few seconds.')) {
                        try {
                          const res = await fetch(`/api/admin/refresh-views?key=${adminKey}`, {
                            method: 'POST'
                          });
                          if (res.ok) {
                            alert('Analytics views refreshed successfully');
                          } else {
                            throw new Error('Refresh failed');
                          }
                        } catch (e) {
                          alert('Failed to refresh views. Check console for details.');
                          console.error(e);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                  >
                    Refresh Views
                  </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <p className="font-medium text-white">Clear Link Cache</p>
                    <p className="text-sm text-muted-foreground">
                      Invalidate tracking link cache (use after link changes)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // This would call revalidateTag in a real implementation
                      alert('Link cache will refresh within 1 hour, or on next deployment.');
                    }}
                    className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm font-medium"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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
