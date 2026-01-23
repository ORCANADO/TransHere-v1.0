'use client';

import { useState } from 'react';
import { X, Copy, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Organization {
    id: string;
    name: string;
    api_key: string;
    created_at: string;
    updated_at: string;
}

interface EditOrganizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    organization: Organization;
    adminKey: string;
}

/**
 * Edit Organization Modal
 * 
 * Modal for editing organization name and regenerating API key.
 */
export function EditOrganizationModal({
    isOpen,
    onClose,
    onSuccess,
    organization,
    adminKey,
}: EditOrganizationModalProps) {
    const [name, setName] = useState(organization.name);
    const [regenerateKey, setRegenerateKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newApiKey, setNewApiKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`/api/admin/organizations/${organization.id}?key=${adminKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name !== organization.name ? name : undefined,
                    regenerate_key: regenerateKey,
                }),
            });

            const result = await res.json();

            if (result.success) {
                if (regenerateKey) {
                    setNewApiKey(result.data.api_key);
                } else {
                    onSuccess();
                    handleClose();
                }
            } else {
                setError(result.error || 'Failed to update organization');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = async () => {
        if (!newApiKey) return;
        try {
            await navigator.clipboard.writeText(newApiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy API key:', error);
        }
    };

    const handleClose = () => {
        setName(organization.name);
        setRegenerateKey(false);
        setError(null);
        setNewApiKey(null);
        setCopied(false);
        onClose();
    };

    const handleDone = () => {
        onSuccess();
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-thick">
            <div className="bg-glass-surface border border-obsidian-rim rounded-2xl shadow-ao-stack max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-obsidian-rim">
                    <h2 className="text-xl font-bold text-glass-primary">
                        {newApiKey ? 'API Key Regenerated' : 'Edit Organization'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-glass-surface transition-all"
                    >
                        <X className="w-5 h-5 text-glass-muted" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!newApiKey ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-glass-primary mb-2">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter organization name"
                                    maxLength={100}
                                    required
                                    className="w-full px-4 py-2.5 bg-glass-surface border border-obsidian-rim rounded-xl text-glass-primary placeholder:text-glass-muted focus:outline-none focus:ring-2 focus:ring-accent-emerald/20 transition-all font-bold"
                                />
                                <p className="text-xs text-glass-muted mt-1 font-bold">
                                    {name.length}/100 characters
                                </p>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={regenerateKey}
                                        onChange={(e) => setRegenerateKey(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-obsidian-rim text-accent-emerald focus:ring-accent-emerald bg-glass-surface"
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-glass-primary group-hover:text-accent-emerald transition-colors">
                                            Regenerate API Key
                                        </span>
                                        <p className="text-xs text-glass-muted mt-0.5 font-bold">
                                            This will invalidate the current API key
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {regenerateKey && (
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-yellow-500">
                                        Warning: Regenerating the API key will immediately invalidate the current key. Any applications using the old key will lose access.
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-500">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 bg-glass-surface border border-obsidian-rim rounded-xl font-bold text-glass-primary hover:bg-glass-surface/80 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || (!name.trim() && !regenerateKey)}
                                    className="flex-1 px-4 py-2.5 bg-accent-emerald text-black rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent-emerald/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {/* Success Message */}
                            <div className="p-4 bg-accent-emerald/10 border border-accent-emerald/20 rounded-xl">
                                <p className="text-sm font-bold text-accent-emerald">
                                    API key regenerated successfully!
                                </p>
                            </div>

                            {/* Warning */}
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-yellow-500 mb-1">
                                        Save this API key now
                                    </p>
                                    <p className="text-xs text-yellow-500/80">
                                        The old API key has been invalidated. Make sure to copy the new key before closing this dialog.
                                    </p>
                                </div>
                            </div>

                            {/* New API Key Display */}
                            <div>
                                <label className="block text-sm font-bold text-glass-primary mb-2">
                                    New API Key
                                </label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-4 py-2.5 bg-glass-surface border border-obsidian-rim rounded-xl text-sm font-mono text-glass-primary break-all">
                                        {newApiKey}
                                    </code>
                                    <button
                                        onClick={handleCopyKey}
                                        className={cn(
                                            "p-2.5 rounded-xl transition-all shadow-sm active:scale-95",
                                            copied
                                                ? "bg-accent-emerald text-black shadow-lg shadow-accent-emerald/20"
                                                : "bg-glass-surface border border-obsidian-rim text-glass-primary hover:bg-glass-surface/80"
                                        )}
                                        title="Copy API key"
                                    >
                                        {copied ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            <Copy className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleDone}
                                className="w-full px-4 py-2.5 bg-accent-emerald text-black rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-accent-emerald/20"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
