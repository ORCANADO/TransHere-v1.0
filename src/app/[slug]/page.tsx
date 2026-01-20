import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { getProfileBySlug } from '@/lib/supabase/queries'
import BridgeProtector from '@/components/features/bridge-protector'
import PreconnectHints from '@/components/features/preconnect-hints'
import { captureTelemetry, logBridgeView } from '@/lib/stealth-logger'

interface PageProps {
    params: Promise<{ slug: string }>
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
        description: 'Exclusive Content & Verified Links. Age-restricted content.',
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

export default async function BridgePage({ params }: PageProps) {
    // Next.js 15: params must be awaited
    const { slug } = await params

    // Fetch profile data
    const profile = await getProfileBySlug(slug)

    // Handle 404
    if (!profile) {
        notFound()
    }

    // === STEALTH TELEMETRY ===
    // Headers must be captured BEFORE after() - context is gone inside callback
    const headersList = await headers()
    const telemetry = captureTelemetry(slug, profile.id || null, headersList)

    // THE GHOST LINK: Server-side Base64 encoding
    const destinationUrl = profile.social_link || 'https://onlyfans.com'
    const encodedDestination = Buffer.from(destinationUrl).toString('base64')

    // === NON-BLOCKING ANALYTICS ===
    // Fires AFTER response is sent to user
    after(async () => {
        await logBridgeView(
            telemetry,
            process.env.NEXT_PUBLIC_SITE_URL || 'https://transhere.vip'
        )
    })

    // Render the Airlock UI with PreconnectHints
    return (
        <main className="min-h-screen bg-background">
            <PreconnectHints priority={true} />
            <BridgeProtector
                encodedDestination={encodedDestination}
                profileName={profile.name}
                avatarUrl={profile.image_url}
            />
        </main>
    )
}
