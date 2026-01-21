import { createClient } from '@/lib/supabase/server';
import { OrgModelsTable } from '@/components/org/org-models-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function OrgModelsPage({
    params,
}: {
    params: Promise<{ orgId: string }>;
}) {
    const { orgId } = await params;
    const supabase = await createClient();

    const { data: models, error } = await supabase
        .from('models')
        .select(`
      id,
      name,
      slug,
      image_url,
      is_verified,
      is_new,
      social_link,
      tags,
      created_at
    `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching models:', error);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Models</h1>
                    <p className="text-muted-foreground">
                        Manage your organization's models
                    </p>
                </div>
                <Button asChild>
                    <Link href={`/org/${orgId}/models/new`}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Model
                    </Link>
                </Button>
            </div>

            <OrgModelsTable models={models || []} orgId={orgId} />
        </div>
    );
}
