'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { decodeDestination } from '@/lib/url-obfuscation';
import { useAnalytics } from '@/hooks/use-analytics';

interface BridgeProtectorProps {
    /** Base64 encoded URL from server */
    encodedDestination: string;
    /** From server via x-is-crawler header */
    isCrawler: boolean;
    /** For analytics tracking */
    modelId: string;
    /** For analytics tracking */
    modelSlug: string;
    /** Display name of the model */
    modelName: string;
    /** For button text logic */
    isVerified: boolean;
    /** Styling variant */
    buttonVariant?: 'primary' | 'secondary';
    /** Additional Tailwind classes */
    className?: string;
    /** Optional view variant (fixed bottom or inline) */
    variant?: 'fixed' | 'inline';
}

export function BridgeProtector({
    encodedDestination,
    isCrawler,
    modelId,
    modelSlug,
    modelName,
    isVerified,
    buttonVariant = 'primary',
    className = '',
    variant = 'fixed'
}: BridgeProtectorProps) {
    const [decodedUrl, setDecodedUrl] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Only decode for humans and after mounting to ensure hydration safety
        if (!isCrawler && encodedDestination) {
            const decoded = decodeDestination(encodedDestination);
            setDecodedUrl(decoded);
        }
    }, [isCrawler, encodedDestination]);

    // Generic text for crawlers, personalized for humans
    const buttonText = isCrawler
        ? "View Profile"
        : isVerified
            ? "Chat with Me"
            : `Chat with ${modelName}`;

    // Use existing ChatButton styling tokens
    // iOS Glassmorphism Style: Frosted glass with Electric Emerald accent
    const baseClasses = `
    h-14 text-lg font-semibold rounded-full 
    backdrop-blur-xl
    border border-white/20
    shadow-[0_0_20px_rgba(0,255,133,0.15)]
    transition-all duration-300 ease-out
    flex items-center justify-center
    whitespace-nowrap
    px-6
    cursor-pointer
    select-none
  `.trim().replace(/\s+/g, ' ');

    const variantClasses = buttonVariant === 'primary'
        ? 'bg-white/10 text-[#00FF85] hover:bg-white/15 hover:border-[#00FF85]/40 hover:shadow-[0_0_25px_rgba(0,255,133,0.25)]'
        : 'bg-white/5 text-white/90 hover:bg-white/10 hover:border-white/30';

    const positionClasses = variant === 'fixed'
        ? 'fixed bottom-4 left-4 right-4 z-50'
        : 'w-full';

    // Skeleton/Loading state
    if (!isMounted || !decodedUrl) {
        return (
            <div className={`${baseClasses} ${variantClasses} ${positionClasses} opacity-50 cursor-wait ${className}`}>
                <div className="w-5 h-5 mr-3 rounded-full bg-white/20 animate-pulse" />
                <span className="opacity-0">{buttonText}</span>
            </div>
        );
    }

    // DIRECT LINK - Works on all browsers including Safari
    return (
        <a
            href={decodedUrl}
            rel="noopener noreferrer"
            className={`${baseClasses} ${variantClasses} ${positionClasses} ${className}`}
            aria-label={buttonText}
        >
            <MessageCircle className="w-5 h-5 mr-3 text-[#00FF85]" />
            {buttonText}
        </a>
    );
}

export default BridgeProtector;
