import { createClient } from '@/lib/supabase/server';
import { TrackingLinksManager } from '@/components/org/tracking-links-manager';
import { Suspense } from 'react';

export const runtime = 'edge';

export default async function OrgTrackingPage({
    params,
}: {
    params: Promise<{ orgId: string }>;
}) {
    const { orgId } = await params;
    const supabase = await createClient();

    // Fetch tracking links with model info
    const { data: trackingLinks, error } = await supabase
        .from('tracking_links')
        .select(`
      *,
      model:models(name, slug)
    `)
        .eq('organization_id', orgId)
        .is('is_archived', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tracking links:', error);
    }

    // Fetch organization's models for the dropdown
    const { data: models } = await supabase
        .from('models')
        .select('id, name, slug')
        .eq('organization_id', orgId)
        .order('name');

    // Fetch tracking sources for the dropdown
    const { data: sources } = await supabase
        .from('tracking_sources')
        .select('id, name, slug')
        .order('name');

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground underline decoration-[#7A27FF]/20">Tracking Links</h1>
                <p className="text-muted-foreground">
                    Create and manage tracking links to measure campaign performance and external traffic.
                </p>
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin w-8 h-8 border-2 border-[#7A27FF] border-t-transparent rounded-full" />
                </div>
            }>
                <TrackingLinksManager
                    initialLinks={trackingLinks || []}
                    models={models || []}
                    sources={(sources as any) || []}
                    orgId={orgId}
                />
            </Suspense>
        </div>
    );
}
