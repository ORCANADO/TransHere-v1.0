'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';

interface Model {
    id: string;
    name: string;
    slug: string;
    image_url: string;
    is_verified: boolean;
    is_new: boolean;
    social_link: string;
    tags: string[];
    created_at: string;
}

interface OrgModelsTableProps {
    models: Model[];
    orgId: string;
}

export function OrgModelsTable({ models, orgId }: OrgModelsTableProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const handleDelete = async (modelId: string) => {
        if (!confirm('Are you sure you want to remove this model from your organization?')) {
            return;
        }

        setIsDeleting(modelId);
        try {
            const response = await fetch(`/api/org/${orgId}/models/${modelId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                router.refresh();
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to delete model');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Network error');
        } finally {
            setIsDeleting(null);
        }
    };

    if (models.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg border-dashed border-border/60">
                <p className="text-muted-foreground">No models found</p>
                <Link
                    href={`/org/${orgId}/models/new`}
                    className={cn(buttonVariants(), "mt-4")}
                >
                    Add your first model
                </Link>
            </div>
        );
    }

    return (
        <div className="border rounded-lg border-border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-12"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {models.map((model) => (
                        <TableRow key={model.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border">
                                    <Image
                                        src={getImageUrl(model.image_url)}
                                        alt={model.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="font-medium text-foreground">{model.name}</div>
                                <div className="text-sm text-muted-foreground">@{model.slug}</div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {model.tags?.slice(0, 3).map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    {model.is_verified && (
                                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">Verified</Badge>
                                    )}
                                    {model.is_new && (
                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">New</Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {new Date(model.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                    <Link
                                        href={`/org/${orgId}/models/${model.id}/edit`}
                                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8 text-muted-foreground hover:text-foreground")}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <a
                                        href={model.social_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8 text-muted-foreground hover:text-foreground")}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                        onClick={() => handleDelete(model.id)}
                                        disabled={isDeleting === model.id}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
