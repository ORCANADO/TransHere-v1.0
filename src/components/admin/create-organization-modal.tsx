'use client';

import { useState } from 'react';
import { X, Copy, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateOrganizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    adminKey: string;
}

/**
 * Create Organization Modal
 * 
 * Modal for creating new organizations.
 * Shows full API key on success (one-time view).
 */
export function CreateOrganizationModal({
    isOpen,
    onClose,
    onSuccess,
    adminKey,
}: CreateOrganizationModalProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdOrg, setCreatedOrg] = useState<{ name: string; api_key: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`/api/admin/organizations?key=${adminKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });

            const result = await res.json();

            if (result.success) {
                setCreatedOrg(result.data);
                onSuccess();
            } else {
                setError(result.error || 'Failed to create organization');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = async () => {
        if (!createdOrg) return;
        try {
            await navigator.clipboard.writeText(createdOrg.api_key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy API key:', error);
        }
    };

    const handleClose = () => {
        setName('');
        setError(null);
        setCreatedOrg(null);
        setCopied(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0A1221] border border-[#E5E5EA] dark:border-white/10 rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#E5E5EA] dark:border-white/10">
                    <h2 className="text-xl font-bold text-[#1D1D1F] dark:text-white">
                        {createdOrg ? 'Organization Created' : 'Create Organization'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/10 transition-all"
                    >
                        <X className="w-5 h-5 text-[#86868B] dark:text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!createdOrg ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#1D1D1F] dark:text-white mb-2">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter organization name"
                                    maxLength={100}
                                    required
                                    className="w-full px-4 py-2.5 bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-xl text-[#1D1D1F] dark:text-white placeholder:text-[#86868B] dark:placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#00FF85] transition-all"
                                />
                                <p className="text-xs text-[#86868B] dark:text-muted-foreground mt-1">
                                    {name.length}/100 characters
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-sm text-red-500">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-xl font-semibold text-[#1D1D1F] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !name.trim()}
                                    className="flex-1 px-4 py-2.5 bg-[#00FF85] text-black rounded-xl font-semibold hover:bg-[#00FF85]/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Creating...' : 'Create Organization'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {/* Success Message */}
                            <div className="p-4 bg-[#00FF85]/10 border border-[#00FF85]/20 rounded-xl">
                                <p className="text-sm font-semibold text-[#00FF85] mb-1">
                                    Organization "{createdOrg.name}" created successfully!
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
                                        This is the only time you'll see the full API key. Make sure to copy it before closing this dialog.
                                    </p>
                                </div>
                            </div>

                            {/* API Key Display */}
                            <div>
                                <label className="block text-sm font-semibold text-[#1D1D1F] dark:text-white mb-2">
                                    API Key
                                </label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-4 py-2.5 bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-xl text-sm font-mono text-[#1D1D1F] dark:text-white break-all">
                                        {createdOrg.api_key}
                                    </code>
                                    <button
                                        onClick={handleCopyKey}
                                        className={cn(
                                            "p-2.5 rounded-xl transition-all",
                                            copied
                                                ? "bg-[#00FF85]/20 text-[#00FF85]"
                                                : "bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/10"
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
                                onClick={handleClose}
                                className="w-full px-4 py-2.5 bg-[#00FF85] text-black rounded-xl font-semibold hover:bg-[#00FF85]/90 transition-all active:scale-95"
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
