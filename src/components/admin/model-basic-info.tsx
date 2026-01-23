'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X, ExternalLink, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminTheme } from '@/hooks/use-admin-theme';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { UserRole } from '@/types/auth';

interface ModelBasicInfoProps {
  adminKey: string;
  model: any | null;
  isNew: boolean;
  onSaved: (model: any) => void;
  onDeleted?: (modelId: string) => void;
  userRole?: UserRole; // NEW: Role-based access control
  organizationId?: string | null; // NEW: For auto-assignment
}

export function ModelBasicInfo({ adminKey, model, isNew, onSaved, onDeleted, userRole = 'admin', organizationId }: ModelBasicInfoProps) {
  const [formData, setFormData] = useState({
    name: model?.name || '',
    slug: model?.slug || '',
    bio: model?.bio || '',
    bio_es: model?.bio_es || '',
    tags: model?.tags || [],
    social_link: model?.social_link || '',
    image_url: model?.image_url || '',
    is_verified: model?.is_verified || false,
    is_new: model?.is_new !== undefined ? model.is_new : true,
    is_pinned: model?.is_pinned || false,
    organization_id: model?.organization_id || organizationId || null,
  });

  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Fetch organizations on mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await fetch(`/api/admin/organizations?key=${adminKey}`);
        const json = await res.json();
        if (json.success) {
          setOrganizations(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
      } finally {
        setLoadingOrgs(false);
      }
    };
    fetchOrganizations();
  }, [adminKey]);

  // Update form data when model changes
  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name || '',
        slug: model.slug || '',
        bio: model.bio || '',
        bio_es: model.bio_es || '',
        tags: model.tags || [],
        social_link: model.social_link || '',
        image_url: model.image_url || '',
        is_verified: model.is_verified || false,
        is_new: model.is_new !== undefined ? model.is_new : true,
        is_pinned: model.is_pinned || false,
        organization_id: model.organization_id || null,
      });
    }
  }, [model, organizationId]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-generate slug from name if new model and slug is empty
      if (field === 'name' && isNew && !prev.slug) {
        const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        updated.slug = slug;
      }

      return updated;
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((t: string) => t !== tag)
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      const url = isNew
        ? `/api/admin/models?key=${adminKey}`
        : `/api/admin/models/${model.id}?key=${adminKey}`;

      // Ensure organization_id is set for organization users
      const submitData = {
        ...formData,
        organization_id: userRole === 'organization' && organizationId
          ? organizationId
          : formData.organization_id,
      };

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const json = await res.json();

      if (json.success) {
        onSaved(json.data);
        setError(null);
      } else {
        setError(json.error || 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!model?.id) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/models/${model.id}?key=${adminKey}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (json.success) {
        onDeleted?.(model.id);
      } else {
        setError(json.error || 'Failed to delete model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = formData.name && formData.slug && formData.social_link;
  const { isLightMode } = useAdminTheme();

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg text-accent-red">
          {error}
        </div>
      )}

      {/* Role indicator for organization users */}
      {userRole === 'organization' && (
        <div className="p-4 bg-accent-gold/10 border border-accent-gold/20 rounded-lg text-accent-gold text-sm">
          <p className="font-medium">Organization Access</p>
          <p className="text-accent-gold/80 text-xs mt-1">
            You can edit basic model information. Content management (gallery, stories) is managed by administrators.
          </p>
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={cn(
            "block text-sm font-semibold mb-2",
            "text-[#E2DFD2]",
            "data-[theme=light]:text-[#2E293A]"
          )} data-theme={isLightMode ? 'light' : 'dark'}>
            Model Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Valentina Aguirre"
            className={cn(
              "w-full px-4 py-3 rounded-xl text-sm transition-all duration-150 outline-none",
              "backdrop-blur-[8px]",
              // Dark
              "bg-[#353839]/60 border border-[#555D50] text-[#E2DFD2] placeholder:text-[#9E9E9E]",
              "focus:border-[#7A27FF] focus:ring-2 focus:ring-[#7A27FF]/20",
              // Light
              "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A] data-[theme=light]:placeholder:text-[#6B6B7B] data-[theme=light]:focus:border-[#7A27FF]"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
          />
        </div>

        <div>
          <label className={cn(
            "block text-sm font-semibold mb-2",
            "text-[#E2DFD2]",
            "data-[theme=light]:text-[#2E293A]"
          )} data-theme={isLightMode ? 'light' : 'dark'}>
            Slug * <span className="text-xs font-normal opacity-60">(URL-friendly name)</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => handleChange('slug', e.target.value)}
            placeholder="valentina-aguirre"
            className={cn(
              "w-full px-4 py-3 rounded-xl text-sm transition-all duration-150 outline-none",
              "backdrop-blur-[8px]",
              // Dark
              "bg-[#353839]/60 border border-[#555D50] text-[#E2DFD2] placeholder:text-[#9E9E9E]",
              "focus:border-[#7A27FF] focus:ring-2 focus:ring-[#7A27FF]/20",
              // Light
              "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A] data-[theme=light]:placeholder:text-[#6B6B7B] data-[theme=light]:focus:border-[#7A27FF]"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className={cn(
          "block text-sm font-semibold mb-2",
          "text-[#E2DFD2]",
          "data-[theme=light]:text-[#2E293A]"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          Bio (English)
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="Model description in English..."
          rows={3}
          className={cn(
            "w-full px-4 py-3 rounded-xl text-sm transition-all duration-150 outline-none resize-none",
            "backdrop-blur-[8px]",
            // Dark
            "bg-[#353839]/60 border border-[#555D50] text-[#E2DFD2] placeholder:text-[#9E9E9E]",
            "focus:border-[#7A27FF] focus:ring-2 focus:ring-[#7A27FF]/20",
            // Light
            "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A] data-[theme=light]:placeholder:text-[#6B6B7B] data-[theme=light]:focus:border-[#7A27FF]"
          )}
          data-theme={isLightMode ? 'light' : 'dark'}
        />
      </div>

      <div>
        <label className={cn(
          "block text-sm font-semibold mb-2",
          "text-[#E2DFD2]",
          "data-[theme=light]:text-[#2E293A]"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          Bio (Spanish) <span className="text-xs font-normal opacity-60">(Optional)</span>
        </label>
        <textarea
          value={formData.bio_es}
          onChange={(e) => handleChange('bio_es', e.target.value)}
          placeholder="Descripción del modelo en español..."
          rows={3}
          className={cn(
            "w-full px-4 py-3 rounded-xl text-sm transition-all duration-150 outline-none resize-none",
            "backdrop-blur-[8px]",
            // Dark
            "bg-[#353839]/60 border border-[#555D50] text-[#E2DFD2] placeholder:text-[#9E9E9E]",
            "focus:border-[#7A27FF] focus:ring-2 focus:ring-[#7A27FF]/20",
            // Light
            "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A] data-[theme=light]:placeholder:text-[#6B6B7B] data-[theme=light]:focus:border-[#7A27FF]"
          )}
          data-theme={isLightMode ? 'light' : 'dark'}
        />
      </div>

      {/* Social Link */}
      <div>
        <label className={cn(
          "block text-sm font-semibold mb-2",
          "text-[#E2DFD2]",
          "data-[theme=light]:text-[#2E293A]"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          Social Link (OnlyFans/Fansly) *
        </label>
        <div className="relative">
          <input
            type="url"
            value={formData.social_link}
            onChange={(e) => handleChange('social_link', e.target.value)}
            placeholder="https://onlyfans.com/username"
            className={cn(
              "w-full px-4 py-3 rounded-xl text-sm transition-all duration-150 outline-none pr-12",
              "backdrop-blur-[8px]",
              // Dark
              "bg-[#353839]/60 border border-[#555D50] text-[#E2DFD2] placeholder:text-[#9E9E9E]",
              "focus:border-[#7A27FF] focus:ring-2 focus:ring-[#7A27FF]/20",
              // Light
              "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A] data-[theme=light]:placeholder:text-[#6B6B7B] data-[theme=light]:focus:border-[#7A27FF]"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
          />
          {formData.social_link && (
            <a
              href={formData.social_link}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#7A27FF] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Profile Image URL */}
      <div>
        <label className={cn(
          "block text-sm font-semibold mb-2",
          "text-[#E2DFD2]",
          "data-[theme=light]:text-[#2E293A]"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          Profile Image URL *
        </label>
        <input
          type="text"
          value={formData.image_url}
          onChange={(e) => handleChange('image_url', e.target.value)}
          placeholder="valentina-aguirre/profile.webp"
          className={cn(
            "w-full px-4 py-3 rounded-xl text-sm transition-all duration-150 outline-none",
            "backdrop-blur-[8px]",
            // Dark
            "bg-[#353839]/60 border border-[#555D50] text-[#E2DFD2] placeholder:text-[#9E9E9E]",
            "focus:border-[#7A27FF] focus:ring-2 focus:ring-[#7A27FF]/20",
            // Light
            "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A] data-[theme=light]:placeholder:text-[#6B6B7B] data-[theme=light]:focus:border-[#7A27FF]"
          )}
          data-theme={isLightMode ? 'light' : 'dark'}
        />
        <p className={cn(
          "text-xs font-medium mt-2",
          "text-[#9E9E9E]",
          "data-[theme=light]:text-[#6B6B7B]"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          Path in R2 bucket (e.g., model-slug/profile.webp)
        </p>
      </div>

      {/* Organization - Only editable by admins */}
      {userRole === 'admin' && (
        <div>
          <label className={cn(
            "block text-sm font-bold mb-1 px-1",
            "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60",
            "[font-variation-settings:'opsz'_18,'wdth'_110]"
          )}>
            Organization <span className="text-xs font-medium opacity-70">(Optional)</span>
          </label>
          <select
            value={formData.organization_id || ''}
            onChange={(e) => handleChange('organization_id', e.target.value || null)}
            disabled={loadingOrgs}
            className={cn(
              "w-full px-4 py-2.5 rounded-xl transition-all font-bold",
              "backdrop-blur-[var(--blur-medium)] saturate-[180%]",
              "bg-[var(--surface-obsidian-raised)]/50 border border-[var(--border-obsidian-rim)]/30",
              "text-[var(--text-obsidian-primary)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--glow-obsidian-internal)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              // Light mode
              "liquid-light:bg-[var(--surface-irid-glass)]",
              "liquid-light:text-[var(--text-irid-primary)]",
              "liquid-light:border-[var(--border-irid-rim)]/60 liquid-light:focus:ring-[var(--glow-irid-warm)]"
            )}
          >
            <option value="" className="bg-[var(--surface-obsidian-void)] text-[var(--text-obsidian-primary)]">No Organization (Unassigned)</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id} className="bg-[var(--surface-obsidian-void)] text-[var(--text-obsidian-primary)]">
                {org.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--text-obsidian-muted)]/60 liquid-light:text-[var(--text-irid-primary)]/40 mt-1 font-bold">
            Assign this model to an organization for dashboard access
          </p>
        </div>
      )}

      {/* Tags */}
      <div>
        <label className={cn(
          "block text-sm font-semibold mb-2",
          "text-[#E2DFD2]",
          "data-[theme=light]:text-[#2E293A]"
        )} data-theme={isLightMode ? 'light' : 'dark'}>
          Model Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-4">
          {formData.tags.map((tag: string) => (
            <span
              key={tag}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                "bg-[#5B4965]/30 text-[#E2DFD2] border border-[#5B4965]/50",
                "data-[theme=light]:bg-[#CED9EF]/30 data-[theme=light]:text-[#2E293A] data-[theme=light]:border-[#CED9EF]/50"
              )}
              data-theme={isLightMode ? 'light' : 'dark'}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-[#FF4B4B] transition-colors"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a tag..."
            className={cn(
              "flex-1 px-4 py-3 rounded-xl text-sm transition-all duration-150 outline-none",
              "backdrop-blur-[8px]",
              // Dark
              "bg-[#353839]/60 border border-[#555D50] text-[#E2DFD2] placeholder:text-[#9E9E9E]",
              "focus:border-[#7A27FF] focus:ring-2 focus:ring-[#7A27FF]/20",
              // Light
              "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A] data-[theme=light]:placeholder:text-[#6B6B7B] data-[theme=light]:focus:border-[#7A27FF]"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
          />
          <button
            onClick={addTag}
            className={cn(
              "px-4 py-3 rounded-xl transition-all duration-150 active:scale-95",
              "bg-[#5B4965]/40 text-[#E2DFD2] border border-[#555D50]/50 hover:bg-[#5B4965]/60",
              "data-[theme=light]:bg-[#CED9EF]/40 data-[theme=light]:text-[#2E293A] data-[theme=light]:border-[#CED9EF]/50"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toggles - iOS 26 Style */}
      <div className="flex flex-wrap gap-3">
        <label className="group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 bg-glass-surface border border-obsidian-rim hover:bg-glass-surface/80 active:scale-[0.98]">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.is_verified}
              onChange={(e) => handleChange('is_verified', e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              "w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
              formData.is_verified
                ? "bg-accent-emerald border-accent-emerald shadow-[0_0_12px_rgba(0,255,133,0.3)]"
                : "bg-black/5 dark:bg-white/5 border-obsidian-rim group-hover:border-accent-emerald/50"
            )}>
              {formData.is_verified && (
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-glass-primary select-none">Verified</span>
        </label>

        <label className="group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 bg-glass-surface border border-obsidian-rim hover:bg-glass-surface/80 active:scale-[0.98]">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.is_new}
              onChange={(e) => handleChange('is_new', e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              "w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
              formData.is_new
                ? "bg-accent-violet border-accent-violet shadow-[0_0_12px_rgba(122,39,255,0.3)]"
                : "bg-black/5 dark:bg-white/5 border-obsidian-rim group-hover:border-accent-violet/50"
            )}>
              {formData.is_new && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-glass-primary select-none">New</span>
        </label>

        <label className="group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 bg-glass-surface border border-obsidian-rim hover:bg-glass-surface/80 active:scale-[0.98]">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.is_pinned}
              onChange={(e) => handleChange('is_pinned', e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              "w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center",
              formData.is_pinned
                ? "bg-accent-gold border-accent-gold shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                : "bg-black/5 dark:bg-white/5 border-obsidian-rim group-hover:border-accent-gold/50"
            )}>
              {formData.is_pinned && (
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-glass-primary select-none">Pinned to Top</span>
        </label>
      </div>

      {/* Task 8.6: Save/Cancel Buttons */}
      <div className={cn(
        "flex items-center justify-end gap-3 px-6 py-4 mt-8",
        "border-t border-[#555D50]/30",
        "data-[theme=light]:border-[#CED9EF]/30"
      )} data-theme={isLightMode ? 'light' : 'dark'}>
        {!isNew && (
          <button
            onClick={() => window.location.reload()} // Quick way to reset as we're in a specialized view
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              "border border-[#555D50] text-[#E2DFD2] hover:bg-[#5B4965]/30",
              "data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A] data-[theme=light]:hover:bg-[#EFC8DF]/20"
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
          >
            Reset Changes
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || !isFormValid}
          className={cn(
            "px-8 py-3 rounded-xl text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2",
            "bg-[#00FF85] text-black shadow-[0_0_20px_rgba(0,255,133,0.3)] hover:bg-[#00E077] hover:shadow-[0_0_30px_rgba(0,255,133,0.5)]",
            "active:scale-[0.98]",
            "disabled:opacity-50 disabled:grayscale disabled:shadow-none"
          )}
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isNew ? 'Create Model' : 'Save Changes'}
        </button>
      </div>

      {/* Danger Zone */}
      {!isNew && model && (
        <div className="border border-accent-red/30 rounded-2xl p-6 mt-12 bg-accent-red/5 backdrop-blur-thin">
          <h4 className="text-accent-red font-bold uppercase tracking-widest text-xs mb-3">Danger Zone</h4>
          <p className="text-sm text-glass-muted mb-6 leading-relaxed">
            Permanently delete this model and all associated content (stories, gallery items, tracking links).
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="btn-primary bg-accent-red hover:bg-accent-red/90 text-white shadow-lg shadow-accent-red/20 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all active:scale-95"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Model
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="modal-content">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-accent-red">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-glass-muted">
                  This will permanently delete <span className="text-glass-primary font-bold">{model.name}</span> and all their content:
                  <ul className="list-disc list-inside mt-3 space-y-1">
                    <li>Stories and story groups</li>
                    <li>Gallery items</li>
                    <li>Tracking links</li>
                    <li>Analytics data</li>
                  </ul>
                  <p className="mt-4 font-bold text-accent-red">This action cannot be undone.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-glass-surface border-obsidian-rim text-glass-primary hover:bg-glass-surface/80">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-accent-red hover:bg-accent-red/90 text-white border-none shadow-lg shadow-accent-red/20">
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
