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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0A1221] border border-[#E5E5EA] dark:border-white/10 rounded-2xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#E5E5EA] dark:border-white/10">
                    <h2 className="text-xl font-bold text-[#1D1D1F] dark:text-white">
                        Assign Organization
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#1D1D1F] dark:text-white mb-2">
                                Model
                            </label>
                            <p className="text-sm text-[#86868B] dark:text-muted-foreground">
                                {modelName}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#1D1D1F] dark:text-white mb-2">
                                Organization
                            </label>

                            {fetchingOrgs ? (
                                <div className="px-4 py-2.5 bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-xl">
                                    <p className="text-sm text-[#86868B] dark:text-muted-foreground">
                                        Loading organizations...
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Unassign Option */}
                                    <label className="flex items-center gap-3 p-3 bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-xl cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/10 transition-all">
                                        <input
                                            type="radio"
                                            name="organization"
                                            checked={selectedOrgId === null}
                                            onChange={() => setSelectedOrgId(null)}
                                            className="w-4 h-4 text-[#00FF85] focus:ring-[#00FF85]"
                                        />
                                        <span className="text-sm font-medium text-[#1D1D1F] dark:text-white">
                                            No Organization (Unassigned)
                                        </span>
                                    </label>

                                    {/* Organization Options */}
                                    {organizations.map((org) => (
                                        <label
                                            key={org.id}
                                            className="flex items-center gap-3 p-3 bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-xl cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/10 transition-all"
                                        >
                                            <input
                                                type="radio"
                                                name="organization"
                                                checked={selectedOrgId === org.id}
                                                onChange={() => setSelectedOrgId(org.id)}
                                                className="w-4 h-4 text-[#00FF85] focus:ring-[#00FF85]"
                                            />
                                            <span className="text-sm font-medium text-[#1D1D1F] dark:text-white">
                                                {org.name}
                                            </span>
                                            {selectedOrgId === org.id && (
                                                <Check className="w-4 h-4 text-[#00FF85] ml-auto" />
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
                                className="flex-1 px-4 py-2.5 bg-[#F9F9FB] dark:bg-white/5 border border-[#E5E5EA] dark:border-white/10 rounded-xl font-semibold text-[#1D1D1F] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || fetchingOrgs}
                                className="flex-1 px-4 py-2.5 bg-[#00FF85] text-black rounded-xl font-semibold hover:bg-[#00FF85]/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
