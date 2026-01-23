'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, User, Image as ImageIcon, Grid3x3, Film, Pin, Loader2, Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import { useMaterialFlux } from '@/hooks/use-material-flux';
import { ModelBasicInfo } from './model-basic-info';
import { GalleryManager } from './gallery-manager';
import { StoryManager } from './story-manager';
import { PinnedBlocksManager } from './pinned-blocks-manager';
import type { UserRole, DashboardPermissions } from '@/types/auth';
import { getPermissions } from '@/types/auth';

type Tab = 'basic' | 'gallery' | 'stories' | 'pinned';

interface ModelEditorProps {
  adminKey: string;
  modelId: string | null; // null for new model
  onBack: () => void;
  onSaved: () => void;
  onModelDeleted?: () => void;
  userRole?: UserRole; // NEW: Role-based access control
  organizationId?: string | null; // NEW: For filtering
}

export function ModelEditor({
  adminKey,
  modelId,
  onBack,
  onSaved,
  userRole = 'admin', // Default to admin for backward compatibility
  organizationId = null
}: ModelEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [model, setModel] = useState<any>(null);
  const [loading, setLoading] = useState(!!modelId);

  const fluxRef = useMaterialFlux<HTMLDivElement>();

  // Get permissions based on user role
  const permissions: DashboardPermissions = getPermissions(userRole);

  const fetchModel = useCallback(async () => {
    if (!modelId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/models/${modelId}?key=${adminKey}`);
      const json = await res.json();

      if (json.success) {
        // Verify organization access for non-admin users
        if (userRole === 'organization' && organizationId) {
          if (json.data.organization_id !== organizationId) {
            console.error('Unauthorized access to model');
            onBack();
            return;
          }
        }
        setModel(json.data);
      } else {
        console.error('Failed to fetch model:', json.error);
      }
    } catch (err) {
      console.error('Failed to fetch model:', err);
    } finally {
      setLoading(false);
    }
  }, [adminKey, modelId, userRole, organizationId, onBack]);

  useEffect(() => {
    fetchModel();
  }, [fetchModel]);

  // Define all possible tabs
  const allTabs: { id: Tab; label: string; icon: any; requiresPermission: keyof DashboardPermissions }[] = [
    { id: 'basic', label: 'Basic Info', icon: User, requiresPermission: 'canEditBasicInfo' },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon, requiresPermission: 'showGalleryTab' },
    { id: 'stories', label: 'Stories', icon: Grid3x3, requiresPermission: 'showStoriesTab' },
    { id: 'pinned', label: 'Pinned Blocks', icon: Pin, requiresPermission: 'showPinnedTab' },
  ];

  // Filter tabs based on permissions and model existence
  const availableTabs = modelId
    ? allTabs.filter(tab => permissions[tab.requiresPermission])
    : [allTabs[0]]; // Only basic info for new models

  // Reset to basic tab if current tab is no longer available
  useEffect(() => {
    if (!availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab('basic');
    }
  }, [availableTabs, activeTab]);

  const { isLightMode } = useAdminTheme();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-accent-violet" />
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen">
      {/* Task 8.2: Editor Header with Back Button */}
      <header className={cn(
        "sticky top-0 z-40 px-6 py-4",
        "backdrop-blur-[24px] saturate-[140%]",
        "border-b transition-all duration-300",

        // Dark
        "bg-[#0B0C0C]/80 border-[#555D50]/50",
        // Light
        "data-[theme=light]:bg-[#F9F6EE]/80 data-[theme=light]:border-[#CED9EF]/50"
      )} data-theme={isLightMode ? 'light' : 'dark'}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={cn(
                "p-2 rounded-xl border transition-all duration-150 active:scale-95",
                "border-[#555D50] text-[#9E9E9E] hover:text-[#E2DFD2] hover:bg-[#5B4965]/30",
                "data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#2E293A] data-[theme=light]:hover:bg-[#EFC8DF]/30"
              )}
              data-theme={isLightMode ? 'light' : 'dark'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={cn(
                "text-xl font-semibold",
                "text-[#E2DFD2]",
                "data-[theme=light]:text-[#2E293A]"
              )} data-theme={isLightMode ? 'light' : 'dark'}>
                {modelId ? `Edit: ${model?.name || 'Model'}` : 'Add New Model'}
              </h1>
              {model?.slug && (
                <p className={cn(
                  "text-sm font-bold",
                  "text-[#9E9E9E]",
                  "data-[theme=light]:text-[#6B6B7B]"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                  @{model.slug}
                </p>
              )}
            </div>
          </div>

          {/* Role indicator for organization users */}
          {userRole === 'organization' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              Organization Access
            </div>
          )}
        </div>
      </header>

      {/* Task 8.3: Tab Navigation */}
      <nav className={cn(
        "sticky top-[73px] z-30 px-6 py-3",
        "backdrop-blur-[12px] saturate-[120%]",
        "border-b border-[#555D50]/30",
        "data-[theme=light]:border-[#CED9EF]/30",
        "bg-[#0B0C0C]/40 data-[theme=light]:bg-[#F9F6EE]/40"
      )} data-theme={isLightMode ? 'light' : 'dark'}>
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap",
                "text-sm font-bold transition-all duration-150 active:scale-95",

                activeTab === tab.id
                  ? cn(
                    "bg-[#5B4965]/40 text-[#E2DFD2] shadow-lg shadow-[#5B4965]/10",
                    "data-[theme=light]:bg-[#CED9EF]/40 data-[theme=light]:text-[#2E293A]"
                  )
                  : cn(
                    "text-[#9E9E9E] hover:text-[#E2DFD2] hover:bg-[#5B4965]/20",
                    "data-[theme=light]:text-[#6B6B7B]",
                    "data-[theme=light]:hover:text-[#2E293A]",
                    "data-[theme=light]:hover:bg-[#EFC8DF]/20"
                  )
              )}
              data-theme={isLightMode ? 'light' : 'dark'}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div
          ref={fluxRef}
          className={cn(
            "rounded-3xl p-6 overflow-hidden transition-all duration-500",
            "backdrop-blur-[40px] saturate-[180%]",
            "border shadow-2xl",

            // Dark Mode
            "bg-[#3C3F40]/40 border-[#555D50]/40 shadow-black/40",

            // Light Mode
            "data-[theme=light]:bg-white/60 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:shadow-[#CED9EF]/30"
          )}
          data-theme={isLightMode ? 'light' : 'dark'}
        >
          {activeTab === 'basic' && (
            <ModelBasicInfo
              adminKey={adminKey}
              model={model}
              isNew={!modelId}
              onSaved={(savedModel) => {
                setModel(savedModel);
                if (!modelId) {
                  onSaved();
                }
              }}
              userRole={userRole}
              organizationId={organizationId}
            />
          )}

          {activeTab === 'gallery' && model && permissions.showGalleryTab && (
            <GalleryManager
              adminKey={adminKey}
              modelId={model.id}
              modelSlug={model.slug}
              initialItems={model.gallery_items || []}
              onUpdate={fetchModel}
            />
          )}

          {activeTab === 'stories' && model && permissions.showStoriesTab && (
            <StoryManager
              adminKey={adminKey}
              modelId={model.id}
              modelSlug={model.slug}
              storyGroups={model.story_groups || []}
              onUpdate={fetchModel}
            />
          )}

          {activeTab === 'pinned' && model && permissions.showPinnedTab && (
            <PinnedBlocksManager
              adminKey={adminKey}
              modelId={model.id}
              modelSlug={model.slug}
              storyGroups={(model.story_groups || []).filter((g: any) => g.is_pinned)}
              onUpdate={fetchModel}
            />
          )}
        </div>
      </div>
    </div>
  );
}
