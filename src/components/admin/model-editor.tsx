'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  User,
  Image as ImageIcon,
  Film,
  Pin,
  Loader2,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const allTabs: { id: Tab; label: string; icon: typeof User; requiresPermission: keyof DashboardPermissions }[] = [
    { id: 'basic', label: 'Basic Info', icon: User, requiresPermission: 'canEditBasicInfo' },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon, requiresPermission: 'showGalleryTab' },
    { id: 'stories', label: 'Stories', icon: Film, requiresPermission: 'showStoriesTab' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent-violet" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className={cn(
            "p-2 rounded-lg transition-all active:scale-95",
            // Dark Mode
            "bg-[var(--surface-obsidian-raised)] border border-[var(--border-obsidian-rim)]/30 text-[var(--text-obsidian-primary)] hover:bg-[var(--surface-obsidian-glass)]",
            // Light Mode
            "liquid-light:bg-[var(--surface-irid-glass)] liquid-light:border-[var(--border-irid-rim)] liquid-light:text-[var(--text-irid-primary)] liquid-light:hover:bg-black/5"
          )}
          aria-label="Back to models list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className={cn(
            "text-xl font-bold text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]",
            "[font-variation-settings:'opsz'_28,'wght'_600]"
          )}>
            {modelId ? `Edit: ${model?.name || 'Model'}` : 'Add New Model'}
          </h2>
          {model?.slug && (
            <p className="text-sm text-muted-foreground">@{model.slug}</p>
          )}
          {/* Role indicator for organization users */}
          {userRole === 'organization' && (
            <p className={cn(
              "text-xs text-accent-gold mt-1 flex items-center gap-1 font-bold",
              "[font-variation-settings:'opsz'_18,'wdth'_110]"
            )}>
              <Lock className="w-3 h-3" />
              Organization Access - Basic Info Only
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-obsidian-rim)]/20 liquid-light:border-white/30 pb-2 overflow-x-auto scrollbar-hide">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
              "[font-variation-settings:'opsz'_24,'wdth'_105]",
              activeTab === tab.id
                ? "bg-accent-violet text-white shadow-lg shadow-accent-violet/20 active:shadow-[inset_0_0_20px_4px_rgba(255,255,255,0.2)]"
                : "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 hover:text-[var(--text-obsidian-primary)] liquid-light:hover:text-[var(--text-irid-primary)] hover:bg-[var(--surface-obsidian-glass)]/30 liquid-light:hover:bg-[var(--surface-irid-glass)]/40"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}

        {/* Show locked tabs indicator for organization users */}
        {userRole === 'organization' && modelId && (
          <div className="flex items-center gap-2 px-4 py-2 text-muted-foreground/50">
            <Lock className="w-4 h-4" />
            <span className="text-xs">Content management restricted</span>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div
        ref={fluxRef}
        className={cn(
          "rounded-[var(--radius-squircle-sm)] p-6 shadow-[var(--shadow-ao-stack)] liquid-light:shadow-[var(--shadow-ao-light)] flux-border overflow-hidden",
          // Base Glass
          "backdrop-blur-[var(--blur-medium)] saturate-[140%]",
          // Dark Mode
          "bg-[var(--surface-obsidian-glass)]/60 border border-[var(--border-obsidian-rim)]/30",
          // Light Mode
          "liquid-light:bg-[var(--surface-irid-glass)] liquid-light:border-[var(--border-irid-rim)]/40"
        )}
      >
        {activeTab === 'basic' && (
          <ModelBasicInfo
            adminKey={adminKey}
            model={model}
            isNew={!modelId}
            onSaved={(savedModel) => {
              setModel(savedModel);
              if (!modelId) {
                // If new model was created, go back to list
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
  );
}
