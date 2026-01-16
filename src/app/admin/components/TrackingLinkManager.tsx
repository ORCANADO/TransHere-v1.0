'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    X,
    Plus,
    Copy,
    Pencil,
    Trash2,
    ExternalLink,
    Check,
    Loader2,
    Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    TrackingLinkWithDetails,
    TrackingSource,
    TrackingSubtag,
    TrackingLinksResponse
} from '@/types/tracking';

interface TrackingLinkManagerProps {
    isOpen: boolean;
    onClose: () => void;
    modelId: string;
    modelSlug: string;
    modelName: string;
    adminKey: string;
}

type ViewMode = 'list' | 'create' | 'edit';

interface FormState {
    sourceId: string;
    subtagId: string;
    previewUrl: string;
    customSourceName: string;
    customSubtagName: string;
}

const initialFormState: FormState = {
    sourceId: '',
    subtagId: '',
    previewUrl: '',
    customSourceName: '',
    customSubtagName: '',
};

export function TrackingLinkManager({
    isOpen,
    onClose,
    modelId,
    modelSlug,
    modelName,
    adminKey,
}: TrackingLinkManagerProps) {
    // State management
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [links, setLinks] = useState<TrackingLinkWithDetails[]>([]);
    const [sources, setSources] = useState<TrackingSource[]>([]);
    const [subtags, setSubtags] = useState<TrackingSubtag[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [editingLink, setEditingLink] = useState<TrackingLinkWithDetails | null>(null);
    const [showCustomSourceInput, setShowCustomSourceInput] = useState(false);
    const [showCustomSubtagInput, setShowCustomSubtagInput] = useState(false);
    const [formState, setFormState] = useState<FormState>(initialFormState);

    // Base URL for tracking links
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://transhere.vip';

    // Fetch tracking links and sources
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/admin/tracking-links?modelId=${modelId}&key=${adminKey}`
            );
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch data');
            }

            const data: TrackingLinksResponse = result.data;
            setLinks(data.links);
            setSources(data.sources);
            setSubtags(data.subtags);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [modelId, adminKey]);

    // Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchData();
            setViewMode('list');
            setFormState(initialFormState);
            setEditingLink(null);
        }
    }, [isOpen, fetchData]);

    // Copy tracking link to clipboard
    const copyToClipboard = async (link: TrackingLinkWithDetails) => {
        const fullUrl = `${baseUrl}/model/${modelSlug}/${link.slug}`;
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopiedId(link.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Get subtags for selected source
    const getSubtagsForSource = (sourceId: string): TrackingSubtag[] => {
        return subtags.filter(st => st.source_id === sourceId);
    };

    // Create new tracking link
    const handleCreate = async () => {
        if (!formState.sourceId) {
            setError('Please select a traffic source');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/tracking-links?key=${adminKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelId,
                    sourceId: formState.sourceId,
                    subtagId: formState.subtagId || null,
                    previewUrl: formState.previewUrl || null,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to create link');
            }

            // Add new link to list
            setLinks(prev => [...prev, result.data]);
            setViewMode('list');
            setFormState(initialFormState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create link');
        } finally {
            setIsSaving(false);
        }
    };

    // Update existing tracking link
    const handleUpdate = async () => {
        if (!editingLink) return;

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/admin/tracking-links/${editingLink.id}?key=${adminKey}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceId: formState.sourceId,
                        subtagId: formState.subtagId || null,
                        previewUrl: formState.previewUrl || null,
                    }),
                }
            );

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to update link');
            }

            // Update link in list
            setLinks(prev => prev.map(l => l.id === editingLink.id ? result.data : l));
            setViewMode('list');
            setEditingLink(null);
            setFormState(initialFormState);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update link');
        } finally {
            setIsSaving(false);
        }
    };

    // Archive tracking link
    const handleArchive = async (linkId: string) => {
        try {
            const response = await fetch(
                `/api/admin/tracking-links/${linkId}?key=${adminKey}`,
                { method: 'DELETE' }
            );

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to archive link');
            }

            // Remove from list
            setLinks(prev => prev.filter(l => l.id !== linkId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to archive link');
        }
    };

    // Create custom source
    const handleCreateCustomSource = async () => {
        if (!formState.customSourceName.trim()) {
            setError('Please enter a source name');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/tracking-sources?key=${adminKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formState.customSourceName }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to create source');
            }

            // Add new source and select it
            setSources(prev => [...prev, result.data]);
            setFormState(prev => ({
                ...prev,
                sourceId: result.data.id,
                customSourceName: '',
            }));
            setShowCustomSourceInput(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create source');
        } finally {
            setIsSaving(false);
        }
    };

    // Create custom subtag
    const handleCreateSubtag = async () => {
        if (!formState.customSubtagName.trim()) {
            setError('Please enter a subtag name');
            return;
        }

        if (!formState.sourceId) {
            setError('Source must be selected');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/tracking-subtags?key=${adminKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formState.customSubtagName,
                    sourceId: formState.sourceId
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to create subtag');
            }

            // Add new subtag and select it
            setSubtags(prev => [...prev, result.data]);
            setFormState(prev => ({
                ...prev,
                subtagId: result.data.id,
                customSubtagName: '',
            }));
            setShowCustomSubtagInput(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create subtag');
        } finally {
            setIsSaving(false);
        }
    };

    // Start editing a link
    const startEdit = (link: TrackingLinkWithDetails) => {
        setEditingLink(link);
        setFormState({
            sourceId: link.source_id || '',
            subtagId: link.subtag_id || '',
            previewUrl: link.preview_url || '',
            customSourceName: '',
            customSubtagName: '',
        });
        setViewMode('edit');
    };

    if (!isOpen) return null;

    // Render the component
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] md:max-h-[80vh] z-[101] flex flex-col">
                <div className={cn(
                    "flex flex-col h-full rounded-2xl overflow-hidden",
                    "bg-card/95 backdrop-blur-xl",
                    "border border-border",
                    "shadow-2xl shadow-black/50"
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Tracking Links
                            </h2>
                            <p className="text-sm text-muted-foreground">{modelName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Error Display */}
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-[#00FF85] animate-spin" />
                            </div>
                        ) : viewMode === 'list' ? (
                            /* List View */
                            <>
                                {/* Create Button */}
                                <button
                                    onClick={() => {
                                        setFormState(initialFormState);
                                        setViewMode('create');
                                    }}
                                    className={cn(
                                        "w-full mb-6 py-3 px-4 rounded-xl",
                                        "bg-[#00FF85]/10 border border-[#00FF85]/30",
                                        "text-[#00FF85] font-medium",
                                        "hover:bg-[#00FF85]/20 transition-colors",
                                        "flex items-center justify-center gap-2"
                                    )}
                                >
                                    <Plus className="w-5 h-5" />
                                    Create New Tracking Link
                                </button>

                                {/* Links Table */}
                                {links.length === 0 ? (
                                    <div className="text-center py-12 text-white/40">
                                        <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No tracking links yet</p>
                                        <p className="text-sm">Create your first link to start tracking traffic sources</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-white/40 uppercase tracking-wider">
                                            <div className="col-span-2">Slug</div>
                                            <div className="col-span-2">Source</div>
                                            <div className="col-span-2">Subtag</div>
                                            <div className="col-span-3">Preview</div>
                                            <div className="col-span-1 text-center">Clicks</div>
                                            <div className="col-span-2 text-right">Actions</div>
                                        </div>

                                        {/* Table Rows */}
                                        {links.map(link => (
                                            <div
                                                key={link.id}
                                                className={cn(
                                                    "grid grid-cols-12 gap-2 px-3 py-3 rounded-lg",
                                                    "bg-white/5 hover:bg-white/10 transition-colors",
                                                    "items-center"
                                                )}
                                            >
                                                {/* Slug */}
                                                <div className="col-span-2">
                                                    <code className="text-[#00FF85] font-mono text-sm">
                                                        {link.slug}
                                                    </code>
                                                </div>

                                                {/* Source */}
                                                <div className="col-span-2 text-foreground/80 text-sm truncate">
                                                    {link.source_name || '—'}
                                                </div>

                                                {/* Subtag */}
                                                <div className="col-span-2 text-muted-foreground text-sm truncate">
                                                    {link.subtag_name || '—'}
                                                </div>

                                                {/* Preview URL */}
                                                <div className="col-span-3">
                                                    {link.preview_url ? (
                                                        <a
                                                            href={link.preview_url.startsWith('http') ? link.preview_url : `https://${link.preview_url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary text-sm hover:underline flex items-center gap-1 truncate"
                                                        >
                                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">
                                                                {(() => {
                                                                    try {
                                                                        const url = link.preview_url.startsWith('http') ? link.preview_url : `https://${link.preview_url}`;
                                                                        return new URL(url).hostname;
                                                                    } catch {
                                                                        return link.preview_url;
                                                                    }
                                                                })()}
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground/30 text-sm">—</span>
                                                    )}
                                                </div>

                                                {/* Clicks */}
                                                <div className="col-span-1 text-center">
                                                    <span className="text-foreground font-medium">
                                                        {link.click_count.toLocaleString()}
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="col-span-2 flex items-center justify-end gap-1">
                                                    {/* Copy Button */}
                                                    <button
                                                        onClick={() => copyToClipboard(link)}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-colors",
                                                            copiedId === link.id
                                                                ? "bg-[#00FF85]/20 text-[#00FF85]"
                                                                : "hover:bg-white/10 text-white/60"
                                                        )}
                                                        title="Copy tracking URL"
                                                    >
                                                        {copiedId === link.id ? (
                                                            <Check className="w-4 h-4" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>

                                                    {/* Edit Button */}
                                                    <button
                                                        onClick={() => startEdit(link)}
                                                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 transition-colors"
                                                        title="Edit link"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>

                                                    {/* Archive Button */}
                                                    <button
                                                        onClick={() => handleArchive(link.id)}
                                                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                                                        title="Archive link"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Create/Edit Form */
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <button
                                        onClick={() => {
                                            setViewMode('list');
                                            setEditingLink(null);
                                            setFormState(initialFormState);
                                        }}
                                        className="text-white/60 hover:text-white transition-colors"
                                    >
                                        ← Back
                                    </button>
                                    <h3 className="text-lg font-medium text-white">
                                        {viewMode === 'create' ? 'Create New Link' : 'Edit Link'}
                                    </h3>
                                </div>

                                {/* Source Selection */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">
                                        Traffic Source <span className="text-red-400">*</span>
                                    </label>

                                    {showCustomSourceInput ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formState.customSourceName}
                                                onChange={(e) => setFormState(prev => ({
                                                    ...prev,
                                                    customSourceName: e.target.value
                                                }))}
                                                placeholder="Enter custom source name..."
                                                className={cn(
                                                    "flex-1 px-4 py-3 rounded-xl",
                                                    "bg-white/5 border border-white/10",
                                                    "text-white placeholder:text-white/30",
                                                    "focus:outline-none focus:border-[#00FF85]/50"
                                                )}
                                            />
                                            <button
                                                onClick={handleCreateCustomSource}
                                                disabled={isSaving}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl",
                                                    "bg-[#00FF85] text-black font-medium",
                                                    "hover:bg-[#00FF85]/90 transition-colors",
                                                    "disabled:opacity-50"
                                                )}
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowCustomSourceInput(false);
                                                    setFormState(prev => ({ ...prev, customSourceName: '' }));
                                                }}
                                                className="px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {sources.map(source => (
                                                <button
                                                    key={source.id}
                                                    onClick={() => setFormState(prev => ({
                                                        ...prev,
                                                        sourceId: source.id,
                                                        subtagId: '', // Reset subtag when source changes
                                                    }))}
                                                    className={cn(
                                                        "px-4 py-3 rounded-xl text-sm transition-colors",
                                                        formState.sourceId === source.id
                                                            ? "bg-[#7A27FF]/20 border-2 border-[#7A27FF] text-[#7A27FF]"
                                                            : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                                                    )}
                                                >
                                                    {source.name}
                                                    {source.is_custom && (
                                                        <span className="ml-1 text-xs text-white/40">(custom)</span>
                                                    )}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setShowCustomSourceInput(true)}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl text-sm",
                                                    "bg-white/5 border border-dashed border-white/20",
                                                    "text-white/60 hover:text-white hover:border-white/40",
                                                    "transition-colors flex items-center justify-center gap-1"
                                                )}
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Custom
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Subtag Selection (if source is selected) */}
                                {formState.sourceId && (
                                    <div>
                                        <label className="block text-sm text-muted-foreground mb-2">
                                            Subtag (Optional)
                                        </label>

                                        {/* Explanation Text */}
                                        <div className="mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                                            <p className="font-medium mb-1">About Subtags</p>
                                            <p>Subtags are designed to track campaigns, multiple accounts in the same traffic source (e.g., separate IG accounts), specific posts, or different placements (like Bio vs. Story). Use them for granular attribution.</p>
                                        </div>

                                        {showCustomSubtagInput ? (
                                            <div className="flex gap-2 mb-3">
                                                <input
                                                    type="text"
                                                    value={formState.customSubtagName}
                                                    onChange={(e) => setFormState(prev => ({
                                                        ...prev,
                                                        customSubtagName: e.target.value
                                                    }))}
                                                    placeholder="Enter subtag name (e.g., 'Bio Link', 'Campaign A')..."
                                                    className={cn(
                                                        "flex-1 px-4 py-3 rounded-xl",
                                                        "bg-card border border-border",
                                                        "text-foreground placeholder:text-muted-foreground",
                                                        "focus:outline-none focus:border-primary/50"
                                                    )}
                                                />
                                                <button
                                                    onClick={handleCreateSubtag}
                                                    disabled={isSaving}
                                                    className={cn(
                                                        "px-4 py-3 rounded-xl",
                                                        "bg-primary text-black font-medium",
                                                        "hover:bg-primary/90 transition-colors",
                                                        "disabled:opacity-50"
                                                    )}
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowCustomSubtagInput(false);
                                                        setFormState(prev => ({ ...prev, customSubtagName: '' }));
                                                    }}
                                                    className="px-4 py-3 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => setFormState(prev => ({ ...prev, subtagId: '' }))}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-sm transition-colors",
                                                        !formState.subtagId
                                                            ? "bg-primary/20 text-primary border border-primary/20"
                                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-transparent"
                                                    )}
                                                >
                                                    None
                                                </button>
                                                {getSubtagsForSource(formState.sourceId).map(subtag => (
                                                    <button
                                                        key={subtag.id}
                                                        onClick={() => setFormState(prev => ({ ...prev, subtagId: subtag.id }))}
                                                        className={cn(
                                                            "px-3 py-2 rounded-lg text-sm transition-colors",
                                                            formState.subtagId === subtag.id
                                                                ? "bg-primary/20 text-primary border border-primary/20"
                                                                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                                        )}
                                                    >
                                                        {subtag.name}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setShowCustomSubtagInput(true)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-sm",
                                                        "bg-secondary border border-dashed border-muted-foreground/30",
                                                        "text-muted-foreground hover:text-foreground hover:border-muted-foreground/60",
                                                        "transition-colors flex items-center justify-center gap-1"
                                                    )}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Add New
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Preview URL */}
                                <div>
                                    <label className="block text-sm text-muted-foreground mb-2">
                                        Preview URL (Optional)
                                    </label>
                                    <p className="text-xs text-muted-foreground/60 mb-2">
                                        Where is this tracking link placed? (e.g., Instagram post URL)
                                    </p>
                                    <div className="relative">
                                        <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="url"
                                            value={formState.previewUrl}
                                            onChange={(e) => setFormState(prev => ({
                                                ...prev,
                                                previewUrl: e.target.value
                                            }))}
                                            placeholder="https://instagram.com/p/..."
                                            className={cn(
                                                "w-full pl-11 pr-4 py-3 rounded-xl",
                                                "bg-card border border-border",
                                                "text-foreground placeholder:text-muted-foreground",
                                                "focus:outline-none focus:border-primary/50"
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Generated URL Preview */}
                                {viewMode === 'edit' && editingLink && (
                                    <div className="p-4 rounded-xl bg-card border border-border">
                                        <p className="text-xs text-muted-foreground mb-1">Tracking URL</p>
                                        <code className="text-primary text-sm break-all">
                                            {baseUrl}/model/{modelSlug}/{editingLink.slug}
                                        </code>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    onClick={viewMode === 'create' ? handleCreate : handleUpdate}
                                    disabled={isSaving || !formState.sourceId}
                                    className={cn(
                                        "w-full py-4 rounded-xl font-medium",
                                        "bg-primary text-black",
                                        "hover:bg-primary/90 transition-colors",
                                        "disabled:opacity-50 disabled:cursor-not-allowed",
                                        "flex items-center justify-center gap-2"
                                    )}
                                >
                                    {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
                                    {viewMode === 'create' ? 'Create Tracking Link' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default TrackingLinkManager;
