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
        <Loader2 className="w-8 h-8 animate-spin text-[#7A27FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-card border border-white/10 rounded-lg text-white hover:border-white/20 transition-colors"
          aria-label="Back to models list"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">
            {modelId ? `Edit: ${model?.name || 'Model'}` : 'Add New Model'}
          </h2>
          {model?.slug && (
            <p className="text-sm text-muted-foreground">@{model.slug}</p>
          )}
          {/* Role indicator for organization users */}
          {userRole === 'organization' && (
            <p className="text-xs text-[#D4AF37] mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Organization Access - Basic Info Only
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-hide">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-[#7A27FF] text-white"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
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
      <div className="bg-card border border-white/10 rounded-xl p-6">
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
