'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
}

interface ModelAssignmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    modelId: string;
    modelName: string;
    currentOrganizationId: string | null;
    adminKey: string;
}

/**
 * Model Assignment Dialog
 * 
 * Dialog for assigning/unassigning models to organizations.
 */
export function ModelAssignmentDialog({
    isOpen,
    onClose,
    onSuccess,
    modelId,
    modelName,
    currentOrganizationId,
    adminKey,
}: ModelAssignmentDialogProps) {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(currentOrganizationId);
    const [loading, setLoading] = useState(false);
    const [fetchingOrgs, setFetchingOrgs] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch organizations
    useEffect(() => {
        if (!isOpen) return;

        const fetchOrganizations = async () => {
            setFetchingOrgs(true);
            try {
                const res = await fetch(`/api/admin/organizations?key=${adminKey}`);
                const result = await res.json();

                if (result.success) {
                    setOrganizations(result.data);
                } else {
                    setError('Failed to load organizations');
                }
            } catch (err) {
                setError('An error occurred while loading organizations');
            } finally {
                setFetchingOrgs(false);
            }
        };

        fetchOrganizations();
    }, [isOpen, adminKey]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`/api/admin/models/assign?key=${adminKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_id: modelId,
                    organization_id: selectedOrgId,
                }),
            });

            const result = await res.json();

            if (result.success) {
                onSuccess();
                handleClose();
            } else {
                setError(result.error || 'Failed to assign model');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedOrgId(currentOrganizationId);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-thick">
            <div className="bg-glass-surface border border-obsidian-rim rounded-2xl shadow-ao-stack max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-obsidian-rim">
                    <h2 className="text-xl font-bold text-glass-primary">
                        Assign Organization
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-glass-primary mb-2">
                                Model
                            </label>
                            <p className="text-sm text-glass-muted font-bold">
                                {modelName}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-glass-primary mb-2">
                                Organization
                            </label>

                            {fetchingOrgs ? (
                                <div className="px-4 py-2.5 bg-glass-surface border border-obsidian-rim rounded-xl">
                                    <p className="text-sm text-glass-muted font-bold">
                                        Loading organizations...
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Unassign Option */}
                                    <label className="flex items-center gap-3 p-3 bg-glass-surface border border-obsidian-rim rounded-xl cursor-pointer hover:bg-glass-surface/80 transition-all group">
                                        <input
                                            type="radio"
                                            name="organization"
                                            checked={selectedOrgId === null}
                                            onChange={() => setSelectedOrgId(null)}
                                            className="w-4 h-4 text-accent-emerald focus:ring-accent-emerald bg-glass-surface"
                                        />
                                        <span className="text-sm font-bold text-glass-primary group-hover:text-accent-emerald transition-colors">
                                            No Organization (Unassigned)
                                        </span>
                                    </label>

                                    {/* Organization Options */}
                                    {organizations.map((org) => (
                                        <label
                                            key={org.id}
                                            className="flex items-center gap-3 p-3 bg-glass-surface border border-obsidian-rim rounded-xl cursor-pointer hover:bg-glass-surface/80 transition-all group"
                                        >
                                            <input
                                                type="radio"
                                                name="organization"
                                                checked={selectedOrgId === org.id}
                                                onChange={() => setSelectedOrgId(org.id)}
                                                className="w-4 h-4 text-accent-emerald focus:ring-accent-emerald bg-glass-surface"
                                            />
                                            <span className="text-sm font-bold text-glass-primary group-hover:text-accent-emerald transition-colors">
                                                {org.name}
                                            </span>
                                            {selectedOrgId === org.id && (
                                                <Check className="w-4 h-4 text-accent-emerald ml-auto" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}
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
                                className="flex-1 px-4 py-2.5 bg-glass-surface border border-obsidian-rim rounded-xl font-bold text-glass-primary hover:bg-glass-surface/80 transition-all active:scale-95 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || fetchingOrgs}
                                className="flex-1 px-4 py-2.5 bg-accent-emerald text-black rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent-emerald/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Assigning...' : 'Assign'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
