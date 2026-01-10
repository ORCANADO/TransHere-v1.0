'use client';

import { useEffect, useState } from 'react';

// Lazy load the actual header to avoid SSR issues
export function ProfileHeaderClient() {
  const [isMounted, setIsMounted] = useState(false);

  // Only render after mount to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  // Import and render inline to avoid dynamic import issues
  return <ProfileHeaderInner />;
}

// Inner component with all the UI logic
function ProfileHeaderInner() {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          url: window.location.href,
          title: 'Check out this profile on TranSpot',
        });
        return;
      } catch {
        // Fall through to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch {
        // Silent fail
      }
    }
  };

  // Dynamic imports for icons to reduce initial bundle
  const { ChevronLeft, Share2, Check } = require('lucide-react');
  const Link = require('next/link').default;
  const { Button } = require('@/components/ui/button');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none lg:hidden">
      <div className="flex items-center justify-between p-4 pointer-events-auto">
        {/* Back Button */}
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/90 hover:text-white hover:bg-white/10"
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

        {/* Share Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="text-white/90 hover:text-white hover:bg-white/10 w-[72px] flex items-center justify-center"
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
