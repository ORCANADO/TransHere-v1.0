import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { getProfileBySlug } from '@/lib/supabase/queries'
import BridgeAirlock from '@/components/features/bridge-airlock'
import PreconnectHints from '@/components/features/preconnect-hints'
import { captureTelemetry, logBridgeView } from '@/lib/stealth-logger'
import { DEBUG_BYPASS_PARAM, DEBUG_BYPASS_VALUE } from '@/lib/bot-detection'

export const runtime = 'edge';

interface PageProps {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const profile = await getProfileBySlug(slug)

    if (!profile) {
        return {
            title: 'Profile Not Found | TransHere',
            robots: { index: false, follow: false },
        }
    }

    return {
        title: `${profile.name} | Social Hub`,
        description: 'View exclusive content from verified creators.',
        robots: {
            index: false,
            follow: false,
            googleBot: {
                index: false,
                follow: false,
                'max-image-preview': 'none',
                'max-snippet': -1,
            },
        },
        openGraph: {
            title: `${profile.name} | TransHere`,
            description: 'View exclusive content from verified creators.',
            type: 'profile',
            images: profile.image_url ? [{ url: profile.image_url }] : [],
        },
    }
}

export default async function BridgePage({ params, searchParams }: PageProps) {
    // Next.js 15: params must be awaited
    const { slug } = await params
    const query = await searchParams

    // Fetch profile data
    const profile = await getProfileBySlug(slug)

    // Handle 404
    if (!profile) {
        notFound()
    }

    // === STEALTH TELEMETRY ===
    // Headers must be captured BEFORE after() - context is gone inside callback
    const headersList = await headers()

    // Check for debug bypass
    const debugBypass = query[DEBUG_BYPASS_PARAM] === DEBUG_BYPASS_VALUE

    const telemetry = captureTelemetry(slug, profile.id || null, headersList, debugBypass)

    // THE GHOST LINK: Server-side Base64 encoding
    const destinationUrl = profile.social_link || 'https://onlyfans.com'
    const encodedDestination = Buffer.from(destinationUrl).toString('base64')

    // === NON-BLOCKING ANALYTICS ===
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    // IMPORTANT: `after()` does not execute reliably in Edge runtime on localhost.
    if (process.env.NODE_ENV === 'development') {
        await logBridgeView(telemetry, siteUrl);
    } else {
        after(async () => {
            await logBridgeView(telemetry, siteUrl);
        });
    }

    // Render the Airlock UI with PreconnectHints
    return (
        <main className="min-h-screen bg-background">
            <PreconnectHints priority={true} />
            <BridgeAirlock
                encodedDestination={encodedDestination}
                profileName={profile.name}
                avatarUrl={profile.image_url || ''}
                modelSlug={profile.slug}
                modelId={profile.id}
            />
        </main>
    )
}
