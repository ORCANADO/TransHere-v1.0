'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Plus,
    Trash2,
    Edit,
    Pin,
    Image as ImageIcon,
    Film,
    RefreshCw,
    Building2,
    Link2
} from 'lucide-react';
import Image from 'next/image';
import { cn, getImageUrl } from '@/lib/utils';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import type { ModelWithCounts } from '@/types/admin';
import type { UserRole, DashboardPermissions } from '@/types/auth';
import { getPermissions } from '@/types/auth';

interface ModelListProps {
    adminKey: string;
    onEditModel: (modelId: string) => void;
    onAddModel: () => void;
    onManageTrackingLinks: (model: { id: string; name: string; slug: string }) => void;
    userRole?: UserRole; // NEW: Role-based access control
    organizationId?: string | null; // NEW: For filtering models
    organizationName?: string | null; // NEW: For display
}

export function ModelList({
    adminKey,
    onEditModel,
    onAddModel,
    onManageTrackingLinks,
    userRole = 'admin',
    organizationId = null,
    organizationName = null
}: ModelListProps) {
    const [models, setModels] = useState<ModelWithCounts[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Get permissions based on user role
    const permissions: DashboardPermissions = getPermissions(userRole);

    const fetchModels = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ key: adminKey });
            if (search) params.set('search', search);

            // Add organization filter for organization users
            if (userRole === 'organization' && organizationId) {
                params.set('organization_id', organizationId);
            }

            const res = await fetch(`/api/admin/models?${params}`);
            const json = await res.json();

            if (json.success) {
                // Double-check organization filter on client side for security
                let filteredModels = json.data;
                if (userRole === 'organization' && organizationId) {
                    filteredModels = json.data.filter(
                        (m: ModelWithCounts) => m.organization_id === organizationId
                    );
                }
                setModels(filteredModels);
            }
        } catch (err) {
            console.error('Failed to fetch models:', err);
        } finally {
            setLoading(false);
        }
    }, [adminKey, search, userRole, organizationId]);

    // Fetch on mount and when dependencies change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchModels();
        }, search ? 300 : 0); // Immediate fetch if no search, debounce if searching

        return () => clearTimeout(timer);
    }, [fetchModels, search]);

    const handleDelete = async (modelId: string) => {
        // Prevent deletion for organization users
        if (!permissions.canDeleteModel) {
            alert('You do not have permission to delete models.');
            return;
        }

        if (deleteConfirm !== modelId) {
            setDeleteConfirm(modelId);
            return;
        }

        try {
            const res = await fetch(`/api/admin/models/${modelId}?key=${adminKey}`, {
                method: 'DELETE',
            });
            const json = await res.json();

            if (json.success) {
                setModels(models.filter(m => m.id !== modelId));
                setDeleteConfirm(null);
            } else {
                alert('Failed to delete: ' + json.error);
                setDeleteConfirm(null);
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete model');
            setDeleteConfirm(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">
                        Models ({models.length})
                    </h2>
                    {/* Organization indicator */}
                    {userRole === 'organization' && organizationName && (
                        <p className="text-sm text-accent-amber flex items-center gap-1 mt-1 font-bold">
                            <Building2 className="w-4 h-4" />
                            {organizationName} Organization
                        </p>
                    )}
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-glass-surface border border-obsidian-rim rounded-xl text-glass-primary text-sm w-full sm:w-64 placeholder:text-glass-muted focus:outline-none focus:ring-2 focus:ring-accent-emerald/20 transition-all"
                        />
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={fetchModels}
                        disabled={loading}
                        className="p-2 bg-glass-surface border border-obsidian-rim rounded-xl text-glass-primary hover:bg-glass-surface/80 transition-all disabled:opacity-50 shadow-sm active:scale-95"
                        aria-label="Refresh models"
                    >
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>

                    {/* Add Model - Only show for admins */}
                    {permissions.canCreateModel && (
                        <button
                            onClick={onAddModel}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-emerald text-black rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent-emerald/20 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">Add Model</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Model List */}
            <div className="space-y-2">
                {loading && models.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Loading models...
                    </div>
                ) : models.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {userRole === 'organization'
                            ? 'No models assigned to your organization yet.'
                            : 'No models found. Add your first model!'}
                    </div>
                ) : (
                    models.map((model) => (
                        <div
                            key={model.id}
                            className="flex items-center gap-4 p-4 bg-glass-surface border border-obsidian-rim rounded-2xl hover:bg-glass-surface/80 transition-all shadow-sm"
                        >
                            {/* Thumbnail */}
                            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-glass-surface flex-shrink-0 border-2 border-obsidian-rim shadow-sm">
                                {model.image_url ? (
                                    <Image
                                        src={getImageUrl(model.image_url)}
                                        alt={model.name}
                                        fill
                                        className="object-cover"
                                        sizes="64px"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-glass-muted" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-white truncate">{model.name}</h3>
                                    {model.is_verified && (
                                        <VerifiedBadge size={16} />
                                    )}
                                    {model.is_new && (
                                        <span className="px-2 py-0.5 bg-accent-violet/20 text-accent-violet text-[10px] rounded-lg font-bold uppercase tracking-wider">
                                            New
                                        </span>
                                    )}
                                    {model.is_pinned && (
                                        <Pin className="w-4 h-4 text-accent-amber" fill="currentColor" />
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">@{model.slug}</p>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        {model.gallery_count} gallery
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Film className="w-3 h-3" />
                                        {model.story_count} stories
                                    </span>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="hidden lg:flex gap-1 flex-wrap max-w-[200px]">
                                {model.tags.slice(0, 3).map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-2 py-0.5 bg-white/5 text-xs text-muted-foreground rounded"
                                    >
                                        {tag}
                                    </span>
                                ))}
                                {model.tags.length > 3 && (
                                    <span className="px-2 py-0.5 text-xs text-muted-foreground">
                                        +{model.tags.length - 3}
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onManageTrackingLinks({ id: model.id, name: model.name, slug: model.slug })}
                                    className="p-2 bg-glass-surface border border-obsidian-rim rounded-lg text-glass-primary hover:bg-glass-surface/80 transition-all active:scale-95 shadow-sm"
                                    aria-label={`Manage tracking links for ${model.name}`}
                                    title="Manage tracking links"
                                >
                                    <Link2 className="w-4 h-4 text-accent-violet" />
                                </button>
                                <button
                                    onClick={() => onEditModel(model.id)}
                                    className="p-2 bg-glass-surface border border-obsidian-rim rounded-lg text-glass-primary hover:bg-glass-surface/80 transition-all active:scale-95 shadow-sm"
                                    aria-label={`Edit ${model.name}`}
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                {/* Delete button - Only show for admins */}
                                {permissions.canDeleteModel && (
                                    <button
                                        onClick={() => handleDelete(model.id)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            deleteConfirm === model.id
                                                ? "bg-red-500 text-white"
                                                : "bg-white/5 text-red-400 hover:bg-red-500/20"
                                        )}
                                        aria-label={deleteConfirm === model.id ? `Confirm delete ${model.name}` : `Delete ${model.name}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
