'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye, MousePointer, TrendingUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/utils';

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
    className,
}: OrganizationModelCardProps) {
    const imageUrl = getImageUrl(model.image_url);

    return (
        <div
            onClick={onClick}
            className={cn(
                "group block rounded-2xl p-4 transition-all duration-300 cursor-pointer",
                "bg-white/5 border border-white/10",
                "hover:bg-white/10 hover:border-[#00FF85]/30 hover:scale-[1.02]",
                "active:scale-[0.98]",
                className
            )}
        >
            <div className="flex items-start gap-4">
                {/* Model Image */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                    <Image
                        src={imageUrl}
                        alt={model.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                    />
                    {/* Online Status Indicator */}
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00FF85] rounded-full border border-background" />
                </div>

                {/* Model Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                            {model.name}
                        </h3>
                        {model.is_verified && (
                            <div className="flex-shrink-0 w-4 h-4">
                                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                                    <path
                                        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                                        fill="url(#verifiedGradient)"
                                    />
                                    <path
                                        d="M9 12L11 14L15 10"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <defs>
                                        <linearGradient id="verifiedGradient" x1="2" y1="2" x2="22" y2="21.02">
                                            <stop offset="0%" stopColor="#007AFF" />
                                            <stop offset="100%" stopColor="#AF52DE" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Tags */}
                    {model.tags && model.tags.length > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                            {model.tags.slice(0, 2).map((tag, index) => (
                                <span
                                    key={index}
                                    className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-muted-foreground"
                                >
                                    {tag}
                                </span>
                            ))}
                            {model.tags.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                    +{model.tags.length - 2}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                            <div className="flex items-center gap-1 text-[#007AFF] mb-0.5">
                                <Eye className="w-3 h-3" />
                                <span className="text-xs font-medium">Views</span>
                            </div>
                            <p className="text-sm font-bold text-white">
                                {stats.views.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-[#AF52DE] mb-0.5">
                                <MousePointer className="w-3 h-3" />
                                <span className="text-xs font-medium">Clicks</span>
                            </div>
                            <p className="text-sm font-bold text-white">
                                {stats.clicks.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-[#D4AF37] mb-0.5">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-xs font-medium">CTR</span>
                            </div>
                            <p className="text-sm font-bold text-white">
                                {stats.ctr.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
