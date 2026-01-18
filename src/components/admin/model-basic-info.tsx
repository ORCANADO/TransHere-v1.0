'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Plus,
  X,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface ModelBasicInfoProps {
  adminKey: string;
  model: any | null;
  isNew: boolean;
  onSaved: (model: any) => void;
  onDeleted: (modelId: string) => void;
}

export function ModelBasicInfo({ adminKey, model, isNew, onSaved, onDeleted }: ModelBasicInfoProps) {
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
  });

  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      });
    }
  }, [model]);

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

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        onDeleted(model.id);
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

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-1 px-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Valentina Aguirre"
            className="w-full px-4 py-2.5 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[#00FF85]/20 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-muted-foreground mb-1 px-1">
            Slug * <span className="text-xs font-medium opacity-70">(URL-friendly name)</span>
          </label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => handleChange('slug', e.target.value)}
            placeholder="valentina-aguirre"
            className="w-full px-4 py-2.5 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[#00FF85]/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-bold text-muted-foreground mb-1 px-1">
          Bio (English)
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="Model description in English..."
          rows={3}
          className="w-full px-4 py-2.5 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-xl text-foreground resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#00FF85]/20 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-muted-foreground mb-1 px-1">
          Bio (Spanish) <span className="text-xs font-medium opacity-70">(Optional)</span>
        </label>
        <textarea
          value={formData.bio_es}
          onChange={(e) => handleChange('bio_es', e.target.value)}
          placeholder="Descripción del modelo en español..."
          rows={3}
          className="w-full px-4 py-2.5 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-xl text-foreground resize-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#00FF85]/20 outline-none transition-all"
        />
      </div>

      {/* Social Link */}
      <div>
        <label className="block text-sm font-bold text-muted-foreground mb-1 px-1">
          Social Link (OnlyFans/Fansly) *
        </label>
        <div className="relative">
          <input
            type="url"
            value={formData.social_link}
            onChange={(e) => handleChange('social_link', e.target.value)}
            placeholder="https://onlyfans.com/username"
            className="w-full px-4 py-2.5 pr-10 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[#00FF85]/20 outline-none transition-all"
          />
          {formData.social_link && (
            <a
              href={formData.social_link}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Profile Image URL */}
      <div>
        <label className="block text-sm font-bold text-muted-foreground mb-1 px-1">
          Profile Image URL *
        </label>
        <input
          type="text"
          value={formData.image_url}
          onChange={(e) => handleChange('image_url', e.target.value)}
          placeholder="valentina-aguirre/profile.webp"
          className="w-full px-4 py-2.5 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[#00FF85]/20 outline-none transition-all"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Path in R2 bucket (e.g., model-slug/profile.webp)
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag: string) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-3 py-1 bg-[#7A27FF]/20 text-[#7A27FF] rounded-full text-sm"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-white transition-colors"
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
            placeholder="Add tag..."
            className="flex-1 px-4 py-2.5 bg-black/[0.03] dark:bg-white/5 border border-border dark:border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[#00FF85]/20 outline-none transition-all"
          />
          <button
            onClick={addTag}
            className="px-4 py-2 bg-black/[0.03] dark:bg-white/5 border border border-border dark:border-white/10 rounded-xl text-foreground hover:bg-black/[0.06] dark:hover:bg-white/10 transition-all active:scale-95"
            aria-label="Add tag"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toggles - iOS 26 Style */}
      <div className="flex flex-wrap gap-3">
        <label className="group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-[2px] bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/15 active:scale-[0.98]">
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
                ? "bg-[#00FF85] border-[#00FF85] shadow-[0_0_12px_rgba(0,255,133,0.3)]"
                : "bg-white/[0.05] border-white/20 group-hover:border-white/30"
            )}>
              {formData.is_verified && (
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm font-medium text-white select-none">Verified</span>
        </label>

        <label className="group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-[2px] bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/15 active:scale-[0.98]">
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
                ? "bg-[#7A27FF] border-[#7A27FF] shadow-[0_0_12px_rgba(122,39,255,0.3)]"
                : "bg-white/[0.05] border-white/20 group-hover:border-white/30"
            )}>
              {formData.is_new && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm font-medium text-white select-none">New</span>
        </label>

        <label className="group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 backdrop-blur-[2px] bg-black/[0.02] dark:bg-white/[0.02] border border-border dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:border-black/20 dark:hover:border-white/15 active:scale-[0.98]">
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
                ? "bg-[#D4AF37] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                : "bg-black/[0.05] dark:bg-white/[0.05] border-border dark:border-white/20 group-hover:border-black/30 dark:group-hover:border-white/30"
            )}>
              {formData.is_pinned && (
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm font-bold text-foreground select-none">Pinned to Top</span>
        </label>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={handleSubmit}
          disabled={saving || !isFormValid}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors",
            saving || !isFormValid
              ? "bg-white/10 text-muted-foreground cursor-not-allowed"
              : "bg-[#00FF85] text-black hover:bg-[#00FF85]/90"
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
        <div className="border border-red-500/30 rounded-lg p-4 mt-8 bg-red-500/5">
          <h4 className="text-red-500 font-medium mb-2">Danger Zone</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete this model and all associated content (stories, gallery items, tracking links).
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Model
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {model.name} and all their content:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Stories and story groups</li>
                    <li>Gallery items</li>
                    <li>Tracking links</li>
                    <li>Analytics data</li>
                  </ul>
                  <p className="mt-4 font-semibold text-red-500">This action cannot be undone.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
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
