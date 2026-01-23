'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye, MousePointer, TrendingUp, ExternalLink, Link2, Shield } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { useAdminTheme } from '@/hooks/use-admin-theme';

interface OrganizationModelCardProps {
    model: {
        id: string;
        name: string;
        slug: string;
        image_url: string;
        is_verified: boolean;
        tags?: string[];
    };
    stats: {
        views: number;
        clicks: number;
        ctr: number;
    };
    onClick?: () => void;
    onManageTrackingLinks?: (e: React.MouseEvent) => void;
    className?: string;
}

/**
 * Organization Model Card
 * 
 * Displays model information with analytics stats for the organization dashboard.
 * Includes verified badge, stats (views, clicks, CTR), and link to model page.
 */
export function OrganizationModelCard({
    model,
    stats,
    onClick,
    onManageTrackingLinks,
    className,
}: OrganizationModelCardProps) {
    const imageUrl = getImageUrl(model.image_url);
    const { isLightMode } = useAdminTheme();

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 cursor-pointer",
                "backdrop-blur-[24px] saturate-[140%]",

                // Dark Mode
                "bg-[#3C3F40]/40 border border-[#555D50]/30 shadow-black/40",
                "hover:bg-[#3C3F40]/60 hover:border-[#7A27FF]/40 hover:scale-[1.02]",
                "active:scale-[0.98]",

                // Light Mode
                "data-[theme=light]:bg-white/60 data-[theme=light]:border-[#CED9EF]/50 data-[theme=light]:shadow-[#CED9EF]/20",
                "data-[theme=light]:hover:bg-white/80 data-[theme=light]:hover:border-[#7A27FF]/40",

                className
            )}
            data-theme={isLightMode ? 'light' : 'dark'}
        >
            <div className="flex items-start gap-4">
                {/* Model Image */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-[#555D50]/50 data-[theme=light]:border-[#CED9EF]/60 shadow-inner" data-theme={isLightMode ? 'light' : 'dark'}>
                    <Image
                        src={imageUrl}
                        alt={model.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                    />
                    {/* Online Status Indicator */}
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00FF85] rounded-full border border-background shadow-[0_0_8px_#00FF85]" />
                </div>

                {/* Model Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-bold text-[#E2DFD2] data-[theme=light]:text-[#2E293A] truncate" data-theme={isLightMode ? 'light' : 'dark'}>
                                {model.name}
                            </h3>
                            {model.is_verified && (
                                <div className="flex-shrink-0 w-4 h-4">
                                    <Shield className="w-full h-full text-[#7A27FF]" />
                                </div>
                            )}
                            <ExternalLink className="w-3.5 h-3.5 text-[#9E9E9E] data-[theme=light]:text-[#6B6B7B] opacity-0 group-hover:opacity-100 transition-opacity" data-theme={isLightMode ? 'light' : 'dark'} />
                        </div>

                        {/* Tracking Link Button */}
                        {onManageTrackingLinks && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onManageTrackingLinks(e);
                                }}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all flex-shrink-0",
                                    "bg-black/20 text-[#9E9E9E] hover:text-[#00FF85] hover:bg-[#5B4965]/30",
                                    "data-[theme=light]:bg-[#CED9EF]/20 data-[theme=light]:text-[#6B6B7B] data-[theme=light]:hover:text-[#7A27FF]"
                                )}
                                title="Manage Tracking Links"
                                data-theme={isLightMode ? 'light' : 'dark'}
                            >
                                <Link2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                            <div className="flex items-center gap-1 text-[#00FF85] mb-0.5">
                                <Eye className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Views</span>
                            </div>
                            <p className="text-sm font-bold text-[#E2DFD2] data-[theme=light]:text-[#2E293A]" data-theme={isLightMode ? 'light' : 'dark'}>
                                {stats.views.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-[#7A27FF] mb-0.5">
                                <MousePointer className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Clicks</span>
                            </div>
                            <p className="text-sm font-bold text-[#E2DFD2] data-[theme=light]:text-[#2E293A]" data-theme={isLightMode ? 'light' : 'dark'}>
                                {stats.clicks.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-[#D4AF37] mb-0.5">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">CTR</span>
                            </div>
                            <p className="text-sm font-bold text-[#E2DFD2] data-[theme=light]:text-[#2E293A]" data-theme={isLightMode ? 'light' : 'dark'}>
                                {stats.ctr.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
