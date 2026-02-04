'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { useAdminTheme } from '@/hooks/use-admin-theme';
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

    // Theme & effects - must be called before any conditional returns (Rules of Hooks)
    const { isLightMode } = useAdminTheme();
    const fluxRef = useMaterialFlux<HTMLDivElement>();

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

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Task 7.1: Modal Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Task 7.2: Modal Container */}
            <div
                ref={fluxRef}
                className={cn(
                    "relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col",
                    "rounded-3xl",
                    "animate-in fade-in-0 zoom-in-95 duration-300",

                    // === DARK MODE ===
                    "bg-gradient-to-b from-[#3C3F40]/[0.98] to-[#353839]/[0.95]",
                    "backdrop-blur-[40px] saturate-[180%]",
                    "border border-[#555D50]",
                    "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),var(--admin-shadow-ao)]",

                    // === LIGHT MODE ===
                    "data-[theme=light]:from-white/[0.98] data-[theme=light]:to-[#F9F6EE]/[0.95]",
                    "data-[theme=light]:border-[#CED9EF]/60",
                    "data-[theme=light]:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15),var(--admin-shadow-light)]"
                )}
                data-theme={isLightMode ? 'light' : 'dark'}
            >
                {/* Task 7.3: Modal Header */}
                <div className={cn(
                    "flex items-center justify-between px-6 py-4",
                    "border-b border-[#555D50]/50",
                    "data-[theme=light]:border-[#CED9EF]/50"
                )} data-theme={isLightMode ? 'light' : 'dark'}>
                    <div>
                        <h2 className={cn(
                            "text-xl font-semibold",
                            "text-[#E2DFD2]",
                            "data-[theme=light]:text-[#2E293A]"
                        )} data-theme={isLightMode ? 'light' : 'dark'}>
                            Tracking Links
                        </h2>
                        <p className={cn(
                            "text-sm font-bold",
                            "text-[#9E9E9E]",
                            "data-[theme=light]:text-[#6B6B7B]"
                        )} data-theme={isLightMode ? 'light' : 'dark'}>
                            {modelName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-2 rounded-xl transition-all duration-150",
                            "text-[#9E9E9E] hover:text-[#E2DFD2]",
                            "hover:bg-[#5B4965]/30",
                            "data-[theme=light]:text-[#6B6B7B]",
                            "data-[theme=light]:hover:text-[#2E293A]",
                            "data-[theme=light]:hover:bg-[#EFC8DF]/30"
                        )}
                        data-theme={isLightMode ? 'light' : 'dark'}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Error Display */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="w-10 h-10 text-[#00FF85] animate-spin" />
                        </div>
                    ) : viewMode === 'list' ? (
                        /* Task 7.4 & 7.5: List View */
                        <>
                            <button
                                onClick={() => {
                                    setFormState(initialFormState);
                                    setViewMode('create');
                                }}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2",
                                    "px-4 py-4 rounded-xl mb-6",
                                    "text-sm font-bold",
                                    "transition-all duration-150",

                                    "border-2 border-dashed",
                                    "border-[#555D50] text-[#E2DFD2]",
                                    "hover:border-[#00FF85] hover:text-[#00FF85]",
                                    "hover:bg-[#00FF85]/10",

                                    "data-[theme=light]:border-[#CED9EF]",
                                    "data-[theme=light]:text-[#2E293A]",
                                    "data-[theme=light]:hover:border-[#00FF85]",
                                    "data-[theme=light]:hover:text-[#00E077]"
                                )}
                                data-theme={isLightMode ? 'light' : 'dark'}
                            >
                                <Plus className="w-4 h-4" />
                                Create New Tracking Link
                            </button>

                            {links.length === 0 ? (
                                <div className="text-center py-12">
                                    <Link2 className="w-12 h-12 mx-auto mb-3 text-[#9E9E9E]/30" />
                                    <p className="text-[#9E9E9E]/60 text-sm">No tracking links yet</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                {['SLUG', 'SOURCE', 'SUBTAG', 'CLICKS', 'ACTIONS'].map((header) => (
                                                    <th
                                                        key={header}
                                                        className={cn(
                                                            "px-4 py-3 text-left",
                                                            "text-[10px] font-bold uppercase tracking-[0.15em]",
                                                            "text-[#9E9E9E]",
                                                            "border-b border-[#555D50]/50",
                                                            "data-[theme=light]:text-[#6B6B7B]",
                                                            "data-[theme=light]:border-[#CED9EF]/50"
                                                        )}
                                                        data-theme={isLightMode ? 'light' : 'dark'}
                                                    >
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#555D50]/20 data-[theme=light]:divide-[#CED9EF]/20" data-theme={isLightMode ? 'light' : 'dark'}>
                                            {links.map((link) => (
                                                <tr
                                                    key={link.id}
                                                    className={cn(
                                                        "transition-colors duration-150",
                                                        "hover:bg-[#5B4965]/10",
                                                        "data-[theme=light]:hover:bg-[#EFC8DF]/10"
                                                    )}
                                                    data-theme={isLightMode ? 'light' : 'dark'}
                                                >
                                                    <td className="px-4 py-4">
                                                        <code className="text-[#60A5FA] text-xs font-mono font-bold bg-[#60A5FA]/10 px-1.5 py-0.5 rounded">
                                                            {link.slug}
                                                        </code>
                                                    </td>
                                                    <td className={cn(
                                                        "px-4 py-4 text-sm font-medium",
                                                        "text-[#E2DFD2]",
                                                        "data-[theme=light]:text-[#2E293A]"
                                                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                                                        {link.source_name || '—'}
                                                    </td>
                                                    <td className={cn(
                                                        "px-4 py-4 text-sm",
                                                        "text-[#9E9E9E]",
                                                        "data-[theme=light]:text-[#6B6B7B]"
                                                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                                                        {link.subtag_name || '—'}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="text-[#00FF85] font-bold tabular-nums">
                                                            {link.click_count.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => copyToClipboard(link)}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-all",
                                                                    copiedId === link.id
                                                                        ? "bg-[#00FF85]/20 text-[#00FF85]"
                                                                        : "text-[#9E9E9E] hover:text-[#E2DFD2] hover:bg-[#5B4965]/30 data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#2E293A] data-[theme=light]:hover:bg-[#EFC8DF]/30"
                                                                )}
                                                                data-theme={isLightMode ? 'light' : 'dark'}
                                                                title="Copy Link"
                                                            >
                                                                {copiedId === link.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => startEdit(link)}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-all",
                                                                    "text-[#9E9E9E] hover:text-[#60A5FA] hover:bg-[#60A5FA]/10",
                                                                    "data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#2E293A] data-[theme=light]:hover:bg-[#CED9EF]/30"
                                                                )}
                                                                data-theme={isLightMode ? 'light' : 'dark'}
                                                                title="Edit"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleArchive(link.id)}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-all",
                                                                    "text-[#9E9E9E] hover:text-red-400 hover:bg-red-400/10"
                                                                )}
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Create/Edit Form */
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <button
                                    onClick={() => {
                                        setViewMode('list');
                                        setEditingLink(null);
                                        setFormState(initialFormState);
                                    }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                        "bg-[#5B4965]/30 text-[#E2DFD2] hover:bg-[#5B4965]/50",
                                        "data-[theme=light]:bg-[#EFC8DF]/30 data-[theme=light]:text-[#2E293A] data-[theme=light]:hover:bg-[#EFC8DF]/50"
                                    )}
                                    data-theme={isLightMode ? 'light' : 'dark'}
                                >
                                    ← Back
                                </button>
                                <h3 className={cn(
                                    "text-lg font-bold",
                                    "text-[#E2DFD2]",
                                    "data-[theme=light]:text-[#2E293A]"
                                )} data-theme={isLightMode ? 'light' : 'dark'}>
                                    {viewMode === 'create' ? 'Create New Link' : 'Edit Link Settings'}
                                </h3>
                            </div>

                            {/* Task 7.6: Source Selection Grid */}
                            <div>
                                <label className={cn(
                                    "block text-sm font-semibold mb-3",
                                    "text-[#9E9E9E]",
                                    "data-[theme=light]:text-[#6B6B7B]"
                                )} data-theme={isLightMode ? 'light' : 'dark'}>
                                    Traffic Source *
                                </label>

                                {showCustomSourceInput ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formState.customSourceName}
                                            onChange={(e) => setFormState(prev => ({ ...prev, customSourceName: e.target.value }))}
                                            placeholder="Enter source name..."
                                            className={cn(
                                                "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                                                "bg-[#3C3F40]/60 border border-[#555D50] text-[#E2DFD2]",
                                                "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A]",
                                                "focus:ring-2 focus:ring-[#7A27FF]/40 outline-none"
                                            )}
                                            data-theme={isLightMode ? 'light' : 'dark'}
                                        />
                                        <button
                                            onClick={handleCreateCustomSource}
                                            disabled={isSaving}
                                            className="px-4 py-2 rounded-xl bg-[#00FF85] text-black font-bold text-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => setShowCustomSourceInput(false)}
                                            className="px-4 py-2 rounded-xl bg-[#5B4965]/30 text-[#E2DFD2] font-bold text-sm hover:bg-[#5B4965]/50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3">
                                        {sources.map((source) => (
                                            <button
                                                key={source.id}
                                                onClick={() => setFormState(prev => ({ ...prev, sourceId: source.id, subtagId: '' }))}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150",
                                                    "border",
                                                    formState.sourceId === source.id
                                                        ? cn(
                                                            "bg-[#5B4965]/50 border-[#5B4965] text-[#E2DFD2] shadow-[0_0_15px_rgba(91,73,101,0.3)]",
                                                            "data-[theme=light]:bg-[#CED9EF]/50 data-[theme=light]:border-[#CED9EF] data-[theme=light]:text-[#2E293A]"
                                                        )
                                                        : cn(
                                                            "bg-[#3C3F40]/40 border-[#555D50]/50 text-[#9E9E9E]",
                                                            "hover:border-[#5B4965] hover:text-[#E2DFD2]",
                                                            "data-[theme=light]:bg-white/40 data-[theme=light]:border-[#CED9EF]/40 data-[theme=light]:text-[#6B6B7B]"
                                                        )
                                                )}
                                                data-theme={isLightMode ? 'light' : 'dark'}
                                            >
                                                {source.name}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setShowCustomSourceInput(true)}
                                            className={cn(
                                                "px-4 py-3 rounded-xl text-sm font-bold border-2 border-dashed transition-all",
                                                "border-[#555D50] text-[#9E9E9E] hover:border-[#00FF85] hover:text-[#00FF85]",
                                                "data-[theme=light]:border-[#CED9EF] data-[theme=light]:text-[#6B6B7B]",
                                                "flex items-center justify-center gap-1"
                                            )}
                                            data-theme={isLightMode ? 'light' : 'dark'}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Custom
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Subtag Selection */}
                            {formState.sourceId && (
                                <div className="animate-in fade-in duration-300">
                                    <label className={cn(
                                        "block text-sm font-semibold mb-3",
                                        "text-[#9E9E9E]",
                                        "data-[theme=light]:text-[#6B6B7B]"
                                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                                        Subtag Selection
                                    </label>

                                    {showCustomSubtagInput ? (
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                value={formState.customSubtagName}
                                                onChange={(e) => setFormState(prev => ({ ...prev, customSubtagName: e.target.value }))}
                                                placeholder="Enter subtag name (e.g., 'Bio Link', 'Campaign A')..."
                                                className={cn(
                                                    "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                                                    "bg-[#3C3F40]/60 border border-[#555D50] text-[#E2DFD2]",
                                                    "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A]",
                                                    "focus:ring-2 focus:ring-[#7A27FF]/40 outline-none"
                                                )}
                                                data-theme={isLightMode ? 'light' : 'dark'}
                                            />
                                            <button
                                                onClick={handleCreateSubtag}
                                                disabled={isSaving}
                                                className="px-4 py-2 rounded-xl bg-[#00FF85] text-black font-bold text-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowCustomSubtagInput(false);
                                                    setFormState(prev => ({ ...prev, customSubtagName: '' }));
                                                }}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl font-bold text-sm",
                                                    "bg-[#5B4965]/30 text-[#E2DFD2] hover:bg-[#5B4965]/50"
                                                )}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <button
                                                onClick={() => setFormState(prev => ({ ...prev, subtagId: '' }))}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                                                    !formState.subtagId
                                                        ? "bg-[#00FF85]/20 border-[#00FF85] text-[#00FF85]"
                                                        : "bg-[#3C3F40]/40 border-[#555D50] text-[#9E9E9E] hover:text-[#E2DFD2]"
                                                )}
                                            >
                                                None
                                            </button>
                                            {getSubtagsForSource(formState.sourceId).map(st => (
                                                <button
                                                    key={st.id}
                                                    onClick={() => setFormState(prev => ({ ...prev, subtagId: st.id }))}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                                                        formState.subtagId === st.id
                                                            ? "bg-[#5B4965]/50 border-[#5B4965] text-[#E2DFD2]"
                                                            : "bg-[#3C3F40]/40 border-[#555D50] text-[#9E9E9E] hover:text-[#E2DFD2]"
                                                    )}
                                                >
                                                    {st.name}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setShowCustomSubtagInput(true)}
                                                className={cn(
                                                    "px-3 py-2 rounded-xl text-xs font-bold border-2 border-dashed transition-all",
                                                    "border-[#555D50] text-[#9E9E9E] hover:border-[#00FF85] hover:text-[#00FF85]",
                                                    "data-[theme=light]:border-[#CED9EF] data-[theme=light]:text-[#6B6B7B]",
                                                    "flex items-center justify-center gap-1"
                                                )}
                                                data-theme={isLightMode ? 'light' : 'dark'}
                                            >
                                                <Plus className="w-3 h-3" />
                                                Add New
                                            </button>
                                        </div>
                                    )}

                                    {/* Task 7.7: Subtag Section */}
                                    <div className={cn(
                                        "p-4 rounded-xl",
                                        "bg-[#5B4965]/20 border border-[#5B4965]/30",
                                        "data-[theme=light]:bg-[#CED9EF]/20 data-[theme=light]:border-[#CED9EF]/30"
                                    )} data-theme={isLightMode ? 'light' : 'dark'}>
                                        <h4 className="text-sm font-bold mb-2 text-[#7A27FF]">
                                            About Subtags
                                        </h4>
                                        <p className={cn(
                                            "text-xs leading-relaxed",
                                            "text-[#9E9E9E]",
                                            "data-[theme=light]:text-[#6B6B7B]"
                                        )} data-theme={isLightMode ? 'light' : 'dark'}>
                                            Subtags are designed to track campaigns, multiple accounts in the same
                                            traffic source (e.g., separate IG accounts), specific posts, or different
                                            placements (like Bio vs. Story). Use them for granular attribution.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Preview URL Input */}
                            <div>
                                <label className={cn(
                                    "block text-sm font-semibold mb-2",
                                    "text-[#9E9E9E]",
                                    "data-[theme=light]:text-[#6B6B7B]"
                                )} data-theme={isLightMode ? 'light' : 'dark'}>
                                    Preview URL (Optional)
                                </label>
                                <div className="relative">
                                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" />
                                    <input
                                        type="url"
                                        value={formState.previewUrl}
                                        onChange={(e) => setFormState(prev => ({ ...prev, previewUrl: e.target.value }))}
                                        placeholder="Paste original post URL..."
                                        className={cn(
                                            "w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium transition-all",
                                            "bg-[#3C3F40]/60 border border-[#555D50] text-[#E2DFD2]",
                                            "data-[theme=light]:bg-white/70 data-[theme=light]:border-[#CED9EF]/60 data-[theme=light]:text-[#2E293A]",
                                            "focus:ring-2 focus:ring-[#7A27FF]/40 outline-none"
                                        )}
                                        data-theme={isLightMode ? 'light' : 'dark'}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        setViewMode('list');
                                        setEditingLink(null);
                                        setFormState(initialFormState);
                                    }}
                                    className={cn(
                                        "flex-1 py-4 rounded-2xl font-bold transition-all",
                                        "bg-[#5B4965]/20 text-[#E2DFD2] hover:bg-[#5B4965]/40",
                                        "data-[theme=light]:bg-[#CED9EF]/30 data-[theme=light]:text-[#2E293A] data-[theme=light]:hover:bg-[#CED9EF]/50"
                                    )}
                                    data-theme={isLightMode ? 'light' : 'dark'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={viewMode === 'create' ? handleCreate : handleUpdate}
                                    disabled={isSaving || !formState.sourceId}
                                    className={cn(
                                        "flex-[2] py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                                        "bg-[#00FF85] text-black shadow-lg shadow-[#00FF85]/20 hover:opacity-90 active:scale-[0.98]",
                                        "disabled:opacity-50 disabled:grayscale"
                                    )}
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    {viewMode === 'create' ? 'Create Tracking Link' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default TrackingLinkManager;
