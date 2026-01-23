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
import { useMaterialFlux } from '@/hooks/use-material-flux';
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

    const fluxRef = useMaterialFlux<HTMLDivElement>();

    // Render the component
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-[8px] z-[100]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] md:max-h-[80vh] z-[101] flex flex-col">
                <div
                    ref={fluxRef}
                    className={cn(
                        "flex flex-col h-full rounded-2xl overflow-hidden",
                        // Elevated Glass Treatment
                        "bg-[var(--surface-obsidian-raised)]/95 liquid-light:bg-[var(--surface-irid-glass)]",
                        "backdrop-blur-[40px] saturate-[180%]",
                        "border border-[var(--border-obsidian-rim)]/40 liquid-light:border-white/60",
                        "shadow-[var(--shadow-ao-stack)] liquid-light:shadow-[var(--shadow-ao-light)]",
                        // Material Flux
                        "flux-border-elevated"
                    )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-obsidian-rim)]/20 liquid-light:border-white/30 bg-[var(--surface-obsidian-glass)]/20 liquid-light:bg-[var(--surface-irid-glass)]/20">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]">
                                Tracking Links
                            </h2>
                            <p className="text-sm text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 font-bold">{modelName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-[var(--surface-obsidian-glass)]/40 liquid-light:hover:bg-[var(--surface-irid-glass)] text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 hover:text-[var(--text-obsidian-primary)] liquid-light:hover:text-[var(--text-irid-primary)] transition-all active:scale-90"
                        >
                            <X className="w-5 h-5" />
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
                            <div className="flex items-center justify-center py-24">
                                <Loader2 className="w-10 h-10 text-accent-emerald animate-spin" />
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
                                        "w-full mb-6 py-4 px-4 rounded-2xl",
                                        "bg-accent-emerald text-black font-bold",
                                        "hover:opacity-90 transition-all",
                                        "flex items-center justify-center gap-2",
                                        "shadow-lg shadow-accent-emerald/20 active:scale-[0.98]"
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
                                        <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] text-glass-muted uppercase tracking-widest font-semibold">
                                            <div className="col-span-2">Slug</div>
                                            <div className="col-span-2">Source</div>
                                            <div className="col-span-2">Subtag</div>
                                            <div className="col-span-3">Preview</div>
                                            <div className="col-span-1 text-center text-accent-violet">Clicks</div>
                                            <div className="col-span-2 text-right">Actions</div>
                                        </div>

                                        {/* Table Rows */}
                                        {links.map(link => (
                                            <div
                                                key={link.id}
                                                className={cn(
                                                    "grid grid-cols-12 gap-2 px-3 py-3 rounded-lg transition-all",
                                                    "bg-[var(--surface-obsidian-glass)]/30 hover:bg-[var(--surface-obsidian-glass)]/50",
                                                    "liquid-light:bg-[var(--surface-irid-glass)] liquid-light:hover:bg-[var(--surface-irid-glass)]/80",
                                                    "border border-[var(--border-obsidian-rim)]/10 liquid-light:border-white/20",
                                                    "items-center"
                                                )}
                                            >
                                                {/* Slug */}
                                                <div className="col-span-2">
                                                    <code className="text-[#007AFF] dark:text-[#007AFF] font-mono text-sm font-semibold">
                                                        {link.slug}
                                                    </code>
                                                </div>

                                                {/* Source */}
                                                <div className={cn(
                                                    "col-span-2 text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)] text-sm truncate font-medium",
                                                    "[font-variation-settings:'opsz'_24,'wdth'_105]"
                                                )}>
                                                    {link.source_name || '—'}
                                                </div>

                                                {/* Subtag */}
                                                <div className={cn(
                                                    "col-span-2 text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 text-sm truncate",
                                                    "[font-variation-settings:'opsz'_24,'wdth'_105]"
                                                )}>
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
                                                            <span className="truncate font-medium">
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
                                                        <span className="text-[var(--text-obsidian-muted)]/30 liquid-light:text-[var(--text-irid-primary)]/20 text-sm">—</span>
                                                    )}
                                                </div>

                                                {/* Clicks */}
                                                <div className="col-span-1 text-center">
                                                    <span className="text-accent-violet font-bold tabular-nums">
                                                        {link.click_count.toLocaleString()}
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="col-span-2 flex items-center justify-end gap-1">
                                                    {/* Copy Button */}
                                                    <button
                                                        onClick={() => copyToClipboard(link)}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-all active:scale-90",
                                                            copiedId === link.id
                                                                ? "bg-accent-emerald/20 text-accent-emerald"
                                                                : "hover:bg-glass-surface text-glass-muted hover:text-glass-primary"
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
                                                        className="p-2 rounded-lg hover:bg-glass-surface text-glass-muted hover:text-glass-primary transition-all active:scale-95"
                                                        title="Edit link"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>

                                                    {/* Archive Button */}
                                                    <button
                                                        onClick={() => handleArchive(link.id)}
                                                        className="p-2 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/20 text-black/40 dark:text-white/60 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-95"
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
                                        className="text-glass-muted hover:text-glass-primary font-bold transition-colors"
                                    >
                                        ← Back
                                    </button>
                                    <h3 className={cn(
                                        "text-xl font-bold text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]",
                                        "[font-variation-settings:'opsz'_24,'wdth'_110]"
                                    )}>
                                        {viewMode === 'create' ? 'Create New Link' : 'Edit Link'}
                                    </h3>
                                </div>

                                {/* Source Selection */}
                                <div>
                                    <label className={cn(
                                        "block text-sm font-medium mb-2",
                                        "text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]",
                                        "[font-variation-settings:'opsz'_24,'wdth'_110]"
                                    )}>
                                        Traffic Source <span className="text-accent-red liquid-light:text-red-600 font-bold">*</span>
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
                                                    "bg-[var(--surface-obsidian-glass)]/40 liquid-light:bg-[var(--surface-irid-glass)] border border-[var(--border-obsidian-rim)]/30 liquid-light:border-white/60",
                                                    "text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)] placeholder:text-[var(--text-obsidian-muted)]/50 liquid-light:placeholder:text-[var(--text-irid-primary)]/40",
                                                    "focus:outline-none focus:ring-2 focus:ring-accent-violet/20 transition-all font-bold"
                                                )}
                                            />
                                            <button
                                                onClick={handleCreateCustomSource}
                                                disabled={isSaving}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl",
                                                    "bg-[#007AFF] dark:bg-[#00FF85] text-white dark:text-black font-semibold",
                                                    "hover:opacity-90 transition-opacity",
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
                                                className={cn(
                                                    "px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                                    "bg-[var(--surface-obsidian-glass)]/40 hover:bg-[var(--surface-obsidian-glass)]/60 text-[var(--text-obsidian-primary)]",
                                                    "liquid-light:bg-[var(--surface-irid-glass)] liquid-light:text-[var(--text-irid-primary)] liquid-light:hover:bg-black/5"
                                                )}
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
                                                        "px-4 py-3 rounded-xl text-sm transition-all font-bold",
                                                        formState.sourceId === source.id
                                                            ? "bg-accent-violet text-white shadow-lg shadow-accent-violet/20"
                                                            : "bg-[var(--surface-obsidian-glass)]/40 liquid-light:bg-[var(--surface-irid-glass)] border border-[var(--border-obsidian-rim)]/30 liquid-light:border-white/60 text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)] hover:bg-[var(--surface-obsidian-glass)]/60 liquid-light:hover:bg-[var(--surface-irid-glass)]"
                                                    )}
                                                >
                                                    {source.name}
                                                    {source.is_custom && (
                                                        <span className={cn(
                                                            "ml-1 text-[10px] opacity-60",
                                                            formState.sourceId === source.id ? "text-white" : "text-glass-muted"
                                                        )}>(custom)</span>
                                                    )}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setShowCustomSourceInput(true)}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl text-sm font-bold",
                                                    "bg-[var(--surface-obsidian-glass)]/30 liquid-light:bg-[var(--surface-irid-glass)]/50 border border-dashed border-[var(--border-obsidian-rim)]/30 liquid-light:border-white/60",
                                                    "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 hover:text-[var(--text-obsidian-primary)] liquid-light:hover:text-[var(--text-irid-primary)] hover:border-accent-violet/50",
                                                    "transition-all flex items-center justify-center gap-1"
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
                                        <label className={cn(
                                            "block text-sm font-medium mb-2",
                                            "text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]",
                                            "[font-variation-settings:'opsz'_24,'wdth'_110]"
                                        )}>
                                            Subtag (Optional)
                                        </label>

                                        {/* Explanation Text */}
                                        <div className="mb-4 p-4 rounded-2xl bg-accent-violet/5 border border-accent-violet/10">
                                            <p className="font-bold text-accent-violet mb-1 text-xs">About Subtags</p>
                                            <p className={cn(
                                                "leading-relaxed font-bold text-xs",
                                                "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/70",
                                                "[font-variation-settings:'opsz'_18,'wdth'_110]"
                                            )}>Subtags are designed to track campaigns, multiple accounts in the same traffic source (e.g., separate IG accounts), specific posts, or different placements (like Bio vs. Story). Use them for granular attribution.</p>
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
                                                    placeholder="Enter subtag name..."
                                                    className={cn(
                                                        "flex-1 px-4 py-3 rounded-xl transition-all font-bold",
                                                        "backdrop-blur-[8px]",
                                                        "bg-[var(--surface-obsidian-raised)]/50 border border-[var(--border-obsidian-rim)]/30",
                                                        "text-[var(--text-obsidian-primary)] placeholder:text-[var(--text-obsidian-muted)]",
                                                        "focus:outline-none focus:ring-2 focus:ring-[var(--glow-obsidian-internal)]",
                                                        // Light mode
                                                        "liquid-light:bg-white/40 liquid-light:text-[var(--text-irid-primary)]",
                                                        "liquid-light:border-[var(--border-irid-rim)]/40 liquid-light:focus:ring-[var(--glow-irid-warm)]"
                                                    )}
                                                />
                                                <button
                                                    onClick={handleCreateSubtag}
                                                    disabled={isSaving}
                                                    className={cn(
                                                        "px-4 py-3 rounded-xl",
                                                        "bg-accent-emerald text-black font-bold",
                                                        "hover:opacity-90 transition-opacity disabled:opacity-50"
                                                    )}
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowCustomSubtagInput(false);
                                                        setFormState(prev => ({ ...prev, customSubtagName: '' }));
                                                    }}
                                                    className={cn(
                                                        "px-4 py-3 rounded-xl transition-all font-bold text-sm",
                                                        "bg-[var(--surface-obsidian-glass)]/20 hover:bg-[var(--surface-obsidian-glass)]/40 text-[var(--text-obsidian-muted)]",
                                                        "liquid-light:bg-[var(--surface-irid-glass)]/40 liquid-light:text-[var(--text-irid-primary)]/60 liquid-light:hover:bg-black/5"
                                                    )}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => setFormState(prev => ({ ...prev, subtagId: '' }))}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-sm transition-all font-bold",
                                                        formState.subtagId === ''
                                                            ? "bg-accent-emerald text-black shadow-lg shadow-accent-emerald/20 active:shadow-[inset_0_0_20px_4px_var(--glow-obsidian-internal)]"
                                                            : "bg-[var(--surface-obsidian-glass)]/40 liquid-light:bg-[var(--surface-irid-glass)] border border-[var(--border-obsidian-rim)]/30 liquid-light:border-white/60 text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)] hover:bg-[var(--surface-obsidian-glass)]/60 liquid-light:hover:bg-black/5"
                                                    )}
                                                >
                                                    None
                                                </button>
                                                {getSubtagsForSource(formState.sourceId).map(subtag => (
                                                    <button
                                                        key={subtag.id}
                                                        onClick={() => setFormState(prev => ({ ...prev, subtagId: subtag.id }))}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-sm transition-all font-bold",
                                                            formState.subtagId === subtag.id
                                                                ? "bg-accent-emerald text-black shadow-lg shadow-accent-emerald/20"
                                                                : "bg-glass-surface border border-obsidian-rim text-glass-primary hover:bg-glass-surface/80"
                                                        )}
                                                    >
                                                        {subtag.name}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setShowCustomSubtagInput(true)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                                        "bg-transparent border border-dashed border-[var(--border-obsidian-rim)]/30 liquid-light:border-[var(--border-irid-rim)]/40",
                                                        "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/60 hover:text-[var(--text-obsidian-primary)] liquid-light:hover:text-[var(--text-irid-primary)] hover:border-accent-violet/50",
                                                        "flex items-center justify-center gap-1"
                                                    )}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Add New
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Preview URL */}
                                <div>
                                    <label className={cn(
                                        "block text-sm mb-1",
                                        "text-[var(--text-obsidian-primary)] liquid-light:text-[var(--text-irid-primary)]",
                                        "[font-variation-settings:'opsz'_24,'wdth'_110]"
                                    )}>
                                        Preview URL (Optional)
                                    </label>
                                    <p className={cn(
                                        "text-xs mb-3 font-bold",
                                        "text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/50",
                                        "[font-variation-settings:'opsz'_18,'wdth'_110]"
                                    )}>
                                        Where is this tracking link placed? (e.g., Instagram post URL)
                                    </p>
                                    <div className="relative">
                                        <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-glass-muted" />
                                        <input
                                            type="url"
                                            value={formState.previewUrl}
                                            onChange={(e) => setFormState(prev => ({
                                                ...prev,
                                                previewUrl: e.target.value
                                            }))}
                                            placeholder="https://instagram.com/p/..."
                                            className={cn(
                                                "w-full pl-11 pr-4 py-3 rounded-xl transition-all font-bold",
                                                "backdrop-blur-[8px]",
                                                "bg-[var(--surface-obsidian-raised)]/50 border border-[var(--border-obsidian-rim)]/30",
                                                "text-[var(--text-obsidian-primary)] placeholder:text-[var(--text-obsidian-muted)]",
                                                "focus:outline-none focus:ring-2 focus:ring-[var(--glow-obsidian-internal)]",
                                                // Light mode
                                                "liquid-light:bg-white/40 liquid-light:text-[var(--text-irid-primary)]",
                                                "liquid-light:border-[var(--border-irid-rim)]/40 liquid-light:focus:ring-[var(--glow-irid-warm)]"
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Generated URL Preview */}
                                {viewMode === 'edit' && editingLink && (
                                    <div className="p-4 rounded-xl bg-[var(--surface-obsidian-glass)]/20 liquid-light:bg-black/5 border border-[var(--border-obsidian-rim)]/20 liquid-light:border-black/10">
                                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-obsidian-muted)] liquid-light:text-[var(--text-irid-primary)]/50 mb-1 font-bold">Tracking URL</p>
                                        <code className="text-accent-violet text-sm break-all font-mono font-bold">
                                            {baseUrl}/model/{modelSlug}/{editingLink.slug}
                                        </code>
                                    </div>
                                )}

                                <button
                                    onClick={viewMode === 'create' ? handleCreate : handleUpdate}
                                    disabled={isSaving || !formState.sourceId}
                                    className={cn(
                                        "w-full py-4 rounded-2xl font-bold text-base transition-all",
                                        "bg-accent-emerald text-black",
                                        "hover:opacity-90 hover:shadow-lg hover:shadow-accent-emerald/20",
                                        "active:scale-[0.98]",
                                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
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
