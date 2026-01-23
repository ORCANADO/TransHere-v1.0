'use client'

import { useMemo } from 'react'
import { Lock, ArrowRight } from 'lucide-react'
import { beaconTrack } from '@/lib/stealth-logger'

interface BridgeAirlockProps {
    encodedDestination: string
    profileName: string
    avatarUrl: string
    modelSlug: string
    modelId?: string
}

export default function BridgeAirlock({
    encodedDestination,
    profileName,
    avatarUrl,
    modelSlug,
    modelId,
}: BridgeAirlockProps) {
    // 1. Decode URL at render time
    const destinationUrl = useMemo(() => {
        try {
            return atob(encodedDestination)
        } catch {
            console.error('[BridgeAirlock] Failed to decode destination')
            return '/'
        }
    }, [encodedDestination])

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center space-y-8">
            <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                    <img
                        src={avatarUrl}
                        alt=""
                        aria-hidden="true"
                        className="w-36 h-36 rounded-full blur-3xl opacity-50 scale-110"
                    />
                </div>
                <div className="relative">
                    <img
                        src={avatarUrl}
                        alt={profileName}
                        className="w-32 h-32 rounded-full border-4 border-card object-cover shadow-2xl"
                    />
                    <div className="absolute bottom-0 right-0 bg-card rounded-full p-2 shadow-lg border border-border">
                        <Lock className="w-5 h-5 text-primary" />
                    </div>
                </div>
            </div>

            <div className="space-y-3 max-w-sm">
                <h1 className="text-2xl font-serif font-medium tracking-tight text-white">
                    {profileName}
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    This page contains <span className="text-primary font-medium">18+ Sensitive Content</span>.
                    <br />
                    By entering, you confirm you are of legal age.
                </p>
            </div>

            {/* DIRECT LINK - Works on all browsers including Safari */}
            <a
                href={destinationUrl}
                rel="noopener noreferrer"
                className="w-full max-w-xs h-14 inline-flex items-center justify-center text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-[0_0_20px_rgba(0,255,133,0.4)] hover:shadow-[0_0_30px_rgba(0,255,133,0.6)] transition-all duration-300 active:scale-95 active:opacity-70"
            >
                <span>Enter Profile</span>
                <ArrowRight className="ml-2 w-5 h-5" />
            </a>

            <p className="text-xs text-muted-foreground/40 pt-4">
                Secure gateway powered by TransHere.vip
            </p>
        </div>
    )
}
