'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Lock, ArrowRight, Loader2 } from 'lucide-react'

interface BridgeProtectorProps {
    encodedDestination: string
    profileName: string
    avatarUrl: string
}

export default function BridgeProtector({
    encodedDestination,
    profileName,
    avatarUrl,
}: BridgeProtectorProps) {
    const [isUnlocking, setIsUnlocking] = useState(false)

    const getDestination = (): string => {
        try {
            return atob(encodedDestination)
        } catch {
            console.error('[BridgeProtector] Failed to decode destination')
            return '/'
        }
    }

    const handleEnter = () => {
        setIsUnlocking(true)

        const url = getDestination()

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href).catch(() => {
                // Silently fail - clipboard is nice-to-have, not critical
            })
        }

        window.location.href = url
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center space-y-8">

            {/* Profile Avatar with Glow Effect */}
            <div className="relative">
                {/* Glow Layer - Blurred duplicate behind */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <img
                        src={avatarUrl}
                        alt=""
                        aria-hidden="true"
                        className="w-36 h-36 rounded-full blur-3xl opacity-50 scale-110"
                    />
                </div>

                {/* Main Avatar */}
                <div className="relative">
                    <img
                        src={avatarUrl}
                        alt={profileName}
                        className="w-32 h-32 rounded-full border-4 border-card object-cover shadow-2xl"
                    />

                    {/* Lock Icon Overlay */}
                    <div className="absolute bottom-0 right-0 bg-card rounded-full p-2 shadow-lg border border-border">
                        <Lock className="w-5 h-5 text-primary" />
                    </div>
                </div>
            </div>

            {/* Text Content */}
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

            {/* CTA Button */}
            <Button
                size="lg"
                onClick={handleEnter}
                disabled={isUnlocking}
                className="w-full max-w-xs h-14 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,133,0.4)] hover:shadow-[0_0_30px_rgba(0,255,133,0.6)] transition-all duration-300 active:scale-95 disabled:opacity-70"
            >
                {isUnlocking ? (
                    <>
                        <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                        <span>Unlocking...</span>
                    </>
                ) : (
                    <>
                        <span>Enter Profile</span>
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                )}
            </Button>

            {/* Footer - Trust Signal */}
            <p className="text-xs text-muted-foreground/40 pt-4">
                Secure gateway powered by TransHere.vip
            </p>
        </div>
    )
}
