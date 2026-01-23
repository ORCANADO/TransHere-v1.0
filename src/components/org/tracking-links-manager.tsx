'use client';

import { useState, useMemo } from 'react';
import {
    Plus,
    Copy,
    ExternalLink,
    Trash2,
    MoreHorizontal,
    Check,
    Link2,
    AlertCircle,
    Loader2,
    X
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TrackingLink, TrackingSource } from '@/types/tracking';

interface TrackingLinksManagerProps {
    initialLinks: TrackingLink[];
    models: { id: string; name: string; slug: string }[];
    sources: TrackingSource[];
    orgId: string;
}

export function TrackingLinksManager({
    initialLinks,
    models,
    sources,
    orgId,
}: TrackingLinksManagerProps) {
    const [links, setLinks] = useState<TrackingLink[]>(initialLinks);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        destination_url: '',
        model_id: '',
        source_id: '',
    });

    const baseUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/go/`
        : 'https://transhere.vip/go/';

    const handleCopy = (slug: string) => {
        navigator.clipboard.writeText(`${baseUrl}${slug}`);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2000);
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData(prev => ({
            ...prev,
            name,
            slug: generateSlug(name)
        }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/org/${orgId}/tracking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (result.success) {
                setLinks([result.data, ...links]);
                setIsCreateDialogOpen(false);
                setFormData({ name: '', slug: '', destination_url: '', model_id: '', source_id: '' });
            } else {
                alert('Error creating link: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to create tracking link');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tracking link?')) return;

        setIsDeleting(id);
        try {
            const response = await fetch(`/api/org/${orgId}/tracking/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setLinks(links.filter(l => l.id !== id));
            }
        } catch (error) {
            console.error('Error deleting link:', error);
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-card/50 backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-xl shadow-black/10">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Active Links</h2>
                    <p className="text-sm text-muted-foreground">{links.length} tracking links configured</p>
                </div>
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-accent-emerald hover:bg-accent-emerald/90 text-black font-bold shadow-lg shadow-accent-emerald/20 border-none rounded-xl"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Link
                </Button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-foreground/70 font-bold uppercase text-[10px] tracking-wider">Link Name</TableHead>
                            <TableHead className="text-foreground/70 font-bold uppercase text-[10px] tracking-wider">Target Destination</TableHead>
                            <TableHead className="text-foreground/70 font-bold uppercase text-[10px] tracking-wider">Model</TableHead>
                            <TableHead className="text-center text-foreground/70 font-bold uppercase text-[10px] tracking-wider">Clicks</TableHead>
                            <TableHead className="text-right text-foreground/70 font-bold uppercase text-[10px] tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {links.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2 opacity-50">
                                        <Link2 className="w-8 h-8" />
                                        <p>No tracking links found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            links.map((link) => (
                                <TableRow key={link.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-foreground">{link.name}</span>
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs bg-accent-violet/10 text-accent-violet px-1.5 py-0.5 rounded font-bold font-mono">
                                                    /{link.slug}
                                                </code>
                                                <button
                                                    onClick={() => handleCopy(link.slug)}
                                                    className="p-1 hover:bg-glass-surface rounded-md transition-all text-glass-muted hover:text-accent-violet"
                                                    title="Copy Link"
                                                >
                                                    {copiedSlug === link.slug ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 max-w-[200px]">
                                            <span className="truncate text-sm text-muted-foreground" title={link.destination_url || ''}>
                                                {link.destination_url || '—'}
                                            </span>
                                            {link.destination_url && (
                                                <a
                                                    href={link.destination_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {link.model ? (
                                            <Badge variant="secondary" className="bg-accent-violet/10 text-accent-violet border-none font-bold">
                                                {link.model.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/50">Global</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="font-mono text-foreground font-medium bg-white/5 px-2 py-1 rounded-lg">
                                            {link.click_count?.toLocaleString() || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(link.id)}
                                            disabled={isDeleting === link.id}
                                            className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                        >
                                            {isDeleting === link.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Modal - Custom Implementation */}
            {isCreateDialogOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => setIsCreateDialogOpen(false)}
                    />
                    <div className="relative bg-glass-surface backdrop-blur-thick border border-obsidian-rim rounded-3xl w-full max-w-lg shadow-ao-stack overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-obsidian-rim/50 flex justify-between items-center bg-glass-surface/20">
                            <h3 className="text-xl font-bold text-glass-primary">Create Tracking Link</h3>
                            <button onClick={() => setIsCreateDialogOpen(false)} className="text-glass-muted hover:text-glass-primary transition-all active:scale-90">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-foreground/80">Link Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Instagram Bio Valentina"
                                    value={formData.name}
                                    onChange={handleNameChange}
                                    required
                                    className="bg-glass-surface/50 border-obsidian-rim focus:ring-2 focus:ring-accent-violet/20 transition-all font-bold text-glass-primary placeholder:text-glass-muted/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug" className="text-foreground/80">Slug URL</Label>
                                <div className="flex gap-2 items-center">
                                    <span className="text-muted-foreground text-sm font-mono">/go/</span>
                                    <Input
                                        id="slug"
                                        placeholder="valentina-ig"
                                        value={formData.slug}
                                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                        className="bg-glass-surface/50 border-obsidian-rim focus:ring-2 focus:ring-accent-violet/20 transition-all font-bold text-glass-primary placeholder:text-glass-muted/50"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="destination" className="text-foreground/80">Destination URL</Label>
                                <Input
                                    id="destination"
                                    type="url"
                                    placeholder="https://onlyfans.com/..."
                                    value={formData.destination_url}
                                    onChange={(e) => setFormData(prev => ({ ...prev, destination_url: e.target.value }))}
                                    required
                                    className="bg-glass-surface/50 border-obsidian-rim focus:ring-2 focus:ring-accent-violet/20 transition-all font-bold text-glass-primary placeholder:text-glass-muted/50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="model" className="text-foreground/80">Assign to Model</Label>
                                    <select
                                        id="model"
                                        value={formData.model_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, model_id: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl bg-glass-surface/50 border border-obsidian-rim text-sm font-bold text-glass-primary focus:outline-none focus:ring-2 focus:ring-accent-violet/20 transition-all"
                                    >
                                        <option value="" className="bg-[#0A1221]">None (Global)</option>
                                        {models.map(m => (
                                            <option key={m.id} value={m.id} className="bg-[#0A1221]">{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="source" className="text-foreground/80">Traffic Source</Label>
                                    <select
                                        id="source"
                                        value={formData.source_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, source_id: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-xl bg-glass-surface/50 border border-obsidian-rim text-sm font-bold text-glass-primary focus:outline-none focus:ring-2 focus:ring-accent-violet/20 transition-all"
                                    >
                                        <option value="" className="bg-[#0A1221]">None</option>
                                        {sources.map(s => (
                                            <option key={s.id} value={s.id} className="bg-[#0A1221]">{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateDialogOpen(false)}
                                    className="flex-1 border-white/10 hover:bg-white/5"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-accent-emerald hover:bg-accent-emerald/90 text-black font-bold rounded-xl shadow-lg shadow-accent-emerald/20"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    Create Link
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
