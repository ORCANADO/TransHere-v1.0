import { Lock, Home } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Access Denied | TransHere',
    description: 'Invalid or missing organization API key',
    robots: 'noindex, nofollow',
};

/**
 * Organization Unauthorized Page
 * 
 * Displayed when API key validation fails.
 * Provides clear error message and navigation back to home.
 */
export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="glass-panel rounded-2xl p-8 border border-white/10 text-center">
                    {/* Lock Icon */}
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-red-500" />
                    </div>

                    {/* Heading */}
                    <h1 className="text-2xl font-bold text-white mb-3">
                        Access Denied
                    </h1>

                    {/* Message */}
                    <p className="text-muted-foreground mb-6">
                        Invalid or missing organization API key. Please contact your administrator for access.
                    </p>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Link
                            href="/"
                            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#00FF85] text-black rounded-xl font-semibold hover:bg-[#00FF85]/90 transition-all active:scale-95"
                        >
                            <Home className="w-4 h-4" />
                            Back to Home
                        </Link>

                        <p className="text-xs text-muted-foreground">
                            If you believe this is an error, please verify your API key and try again.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
