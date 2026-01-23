'use client';

import { useState, useEffect } from 'react';
import { Plus, Copy, Check, ExternalLink, Pencil, Trash2, Shield } from 'lucide-react';
import { CreateOrganizationModal } from './create-organization-modal';
import { EditOrganizationModal } from './edit-organization-modal';
import { cn } from '@/lib/utils';

interface Organization {
    id: string;
    name: string;
    api_key: string;
    created_at: string;
    updated_at: string;
    model_count: number;
}

interface OrganizationManagerProps {
    adminKey: string;
}

/**
 * Organization Manager Component
 * 
 * Main component for managing organizations in the admin dashboard.
 * Displays organizations table with CRUD operations.
 */
export function OrganizationManager({ adminKey }: OrganizationManagerProps) {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Fetch organizations
    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/organizations?key=${adminKey}`);
            const result = await res.json();

            if (result.success) {
                setOrganizations(result.data);
            } else {
                console.error('Failed to fetch organizations:', result.error);
            }
        } catch (error) {
            console.error('Error fetching organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, [adminKey]);

    // Mask API key (first 8 + "..." + last 4)
    const maskApiKey = (key: string) => {
        if (key.length <= 12) return key;
        return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
    };

    // Copy API key to clipboard
    const handleCopyKey = async (key: string, orgId: string) => {
        try {
            await navigator.clipboard.writeText(key);
            setCopiedKey(orgId);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (error) {
            console.error('Failed to copy API key:', error);
        }
    };

    // Delete organization
    const handleDelete = async (org: Organization) => {
        if (org.model_count > 0) {
            alert(`Cannot delete organization with ${org.model_count} assigned models. Please unassign all models first.`);
            return;
        }

        if (!confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
            return;
        }

        setDeletingId(org.id);
        try {
            const res = await fetch(`/api/admin/organizations/${org.id}?key=${adminKey}`, {
                method: 'DELETE',
            });
            const result = await res.json();

            if (result.success) {
                fetchOrganizations();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting organization:', error);
            alert('Failed to delete organization');
        } finally {
            setDeletingId(null);
        }
    };

    // Open organization dashboard in new tab
    const handleViewDashboard = (apiKey: string) => {
        window.open(`/org?key=${apiKey}`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-glass-primary">Organizations</h2>
                    <p className="text-sm text-glass-muted mt-1">
                        Manage organizations and their API keys
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-emerald text-black rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-accent-emerald/20"
                >
                    <Plus className="w-4 h-4" />
                    Create Organization
                </button>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="grid gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-glass-surface border border-obsidian-rim rounded-2xl p-6 animate-pulse shadow-sm">
                            <div className="h-4 bg-glass-surface rounded w-1/4 mb-4" />
                            <div className="h-3 bg-glass-surface rounded w-1/2" />
                        </div>
                    ))}
                </div>
            )}

            {/* Organizations Table */}
            {!loading && organizations.length === 0 && (
                <div className="bg-glass-surface border border-obsidian-rim rounded-2xl p-12 text-center shadow-ao-stack">
                    <Shield className="w-12 h-12 text-glass-muted/30 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-glass-primary mb-2">No organizations yet</h3>
                    <p className="text-sm text-glass-muted mb-6">
                        Create your first organization to get started
                    </p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-2.5 bg-accent-emerald text-black rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-accent-emerald/20"
                    >
                        Create Organization
                    </button>
                </div>
            )}

            {!loading && organizations.length > 0 && (
                <div className="bg-glass-surface border border-obsidian-rim rounded-2xl overflow-hidden shadow-ao-stack">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-glass-surface border-b border-obsidian-rim">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-glass-muted uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-glass-muted uppercase tracking-wider">
                                        API Key
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-glass-muted uppercase tracking-wider">
                                        Models
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-glass-muted uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-glass-muted uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E5EA] dark:divide-white/10">
                                {organizations.map((org) => (
                                    <tr key={org.id} className="hover:bg-foreground/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-glass-muted">
                                                    {maskApiKey(org.api_key)}
                                                </code>
                                                <button
                                                    onClick={() => handleCopyKey(org.api_key, org.id)}
                                                    className={cn(
                                                        "p-1.5 rounded-lg transition-all",
                                                        copiedKey === org.id
                                                            ? "bg-accent-emerald/20 text-accent-emerald"
                                                            : "hover:bg-glass-surface text-glass-muted"
                                                    )}
                                                    title="Copy API key"
                                                >
                                                    {copiedKey === org.id ? (
                                                        <Check className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-glass-primary">
                                                {org.model_count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-glass-muted">
                                                {new Date(org.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewDashboard(org.api_key)}
                                                    className="p-2 rounded-lg hover:bg-glass-surface text-accent-violet transition-all"
                                                    title="View dashboard"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingOrg(org)}
                                                    className="p-2 rounded-lg hover:bg-glass-surface text-glass-muted transition-all"
                                                    title="Edit organization"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(org)}
                                                    disabled={deletingId === org.id}
                                                    className="p-2 rounded-lg hover:bg-accent-red/10 text-accent-red transition-all disabled:opacity-50"
                                                    title="Delete organization"
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
                </div>
            )}

            {/* Modals */}
            <CreateOrganizationModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchOrganizations}
                adminKey={adminKey}
            />

            {editingOrg && (
                <EditOrganizationModal
                    isOpen={!!editingOrg}
                    onClose={() => setEditingOrg(null)}
                    onSuccess={fetchOrganizations}
                    organization={editingOrg}
                    adminKey={adminKey}
                />
            )}
        </div>
    );
}
