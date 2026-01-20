'use client';

import { useState } from 'react';
import { Copy, Check, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrganizationHeaderProps {
    organizationName: string;
    apiKey: string;
    dateRange?: {
        start: string;
        end: string;
    };
}

/**
 * Organization Dashboard Header
 * 
 * Displays organization branding, masked API key with copy functionality,
 * and security warning banner.
 */
export function OrganizationHeader({
    organizationName,
    apiKey,
    dateRange,
}: OrganizationHeaderProps) {
    const [copied, setCopied] = useState(false);

    // Mask API key: show first 8 chars + "..." + last 4 chars
    const maskedKey = apiKey.length > 12
        ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
        : apiKey;

    const handleCopyKey = async () => {
        try {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy API key:', error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Security Warning Banner */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-yellow-500">Keep this URL private</p>
                    <p className="text-xs text-yellow-500/80 mt-1">
                        This page contains your organization's access key. Do not share this URL publicly.
                    </p>
                </div>
            </div>

            {/* Organization Header */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#00FF85]/10 rounded-xl border border-[#00FF85]/20">
                            <Shield className="w-6 h-6 text-[#00FF85]" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#7A27FF] to-[#00FF85] bg-clip-text text-transparent">
                                {organizationName}
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Analytics Dashboard
                            </p>
                        </div>
                    </div>

                    {/* API Key Display */}
                    <div className="flex items-center gap-2">
                        <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-xs text-muted-foreground mb-1">API Key</p>
                            <code className="text-sm font-mono text-white">{maskedKey}</code>
                        </div>
                        <button
                            onClick={handleCopyKey}
                            className={cn(
                                "p-2.5 rounded-lg transition-all",
                                copied
                                    ? "bg-[#00FF85]/20 text-[#00FF85]"
                                    : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                            )}
                            title="Copy API key"
                        >
                            {copied ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Date Range Indicator */}
                {dateRange && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-muted-foreground">
                            Showing data from{' '}
                            <span className="font-semibold text-white">
                                {new Date(dateRange.start).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </span>
                            {' '}to{' '}
                            <span className="font-semibold text-white">
                                {new Date(dateRange.end).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
