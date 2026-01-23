import { createServiceClient } from '@/lib/supabase/service';
import { LivePulseView } from './live-pulse-view';
import { AlertTriangle } from 'lucide-react';

export const runtime = 'edge';

export default async function LivePulsePage({
    searchParams,
}: {
    searchParams: Promise<{ key?: string }>;
}) {
    const { key: adminKey } = await searchParams;

    // 1. Authentication Check
    if (adminKey !== process.env.ADMIN_KEY) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
                <div className="max-w-md text-center border border-white/10 bg-white/5 p-8 rounded-xl backdrop-blur-md">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold mb-2">Access Denied</h1>
                    <p className="text-white/60 mb-4">
                        This is a restricted diagnostic tool.
                    </p>
                    <div className="bg-black/50 p-2 rounded text-xs px-4 py-2 font-mono text-white/40">
                        ERROR: INVALID_ADMIN_KEY
                    </div>
                </div>
            </div>
        );
    }

    // 2. Data Query (Direct to Table)
    const supabase = createServiceClient();

    const now = new Date();
    // Calculate 15 minutes ago
    const fifteenMinutesAgoDate = new Date(now.getTime() - 15 * 60 * 1000);
    const fifteenMinutesAgo = fifteenMinutesAgoDate.toISOString();

    const { data: events, error } = await supabase
        .from('analytics_events')
        .select('created_at, event_type, model_slug, country, city, user_agent, referrer')
        .gte('created_at', fifteenMinutesAgo)
        .lte('created_at', now.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        return (
            <div className="p-8 text-red-500 font-mono">
                Error fetching events: {JSON.stringify(error)}
            </div>
        );
    }

    // 3. Render View
    return (
        <div className="relative">
            {/* Debug Overlay */}
            <div className="fixed bottom-4 right-4 bg-black/80 text-xs text-white p-2 rounded z-50 font-mono pointer-events-none opacity-50 hover:opacity-100">
                <p>Server Time: {now.toISOString()}</p>
                <p>Query Cutoff: {fifteenMinutesAgo}</p>
                <p>Results: {events?.length || 0}</p>
            </div>
            <LivePulseView initialEvents={events || []} adminKey={adminKey || ''} />
        </div>
    );
}
