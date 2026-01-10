'use client';

import Link from 'next/link';
import { ChevronLeft, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShare } from '@/hooks/use-share';

export function ProfileHeader() {
  const { share, isCopied } = useShare();

  const handleShare = async () => {
    if (typeof window !== 'undefined') {
      await share({
        url: window.location.href,
        title: 'Check out this profile on TranSpot',
      });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-white/10 pointer-events-none lg:hidden">
      <div className="flex items-center justify-between p-4 pointer-events-auto">
        {/* Back Button - Glassmorphism pill */}
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/90 hover:text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-full"
          >
            <ChevronLeft size={20} />
            Back
          </Button>
        </Link>

        {/* Brand Name - Electric Emerald accent */}
        <Link href="/" className="flex items-center">
          <span className="text-white font-bold tracking-tighter">
            Tran<span className="text-[#00FF85]">Spot</span>
          </span>
        </Link>

        {/* Share Button - Glassmorphism pill */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="text-white/90 hover:text-white bg-white/5 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-full w-[72px] flex items-center justify-center"
          aria-label="Share profile"
        >
          {isCopied ? (
            <Check size={20} className="text-[#00FF85]" />
          ) : (
            <Share2 size={20} />
          )}
        </Button>
      </div>
    </header>
  );
}

