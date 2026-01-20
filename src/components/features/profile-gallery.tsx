"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";
import { cn, getImageUrl } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";
import { decodeDestination } from "@/lib/url-obfuscation";
import type { GalleryItem } from "@/types";

// Video Player Component with Intersection Observer
interface VideoPlayerProps {
  mp4Url: string;
  webmUrl: string;
  posterUrl: string | null;
  isLocked?: boolean;
}

function VideoPlayer({ mp4Url, webmUrl, posterUrl, isLocked = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Intersection Observer to detect when video is in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is visible - play from beginning
            video.currentTime = 0;
            video.play().catch((err) => {
              // Ignore autoplay errors (browser policy)
              console.debug('Video autoplay prevented:', err);
            });
          } else {
            // Video is not visible - pause and reset
            video.pause();
            video.currentTime = 0;
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of video is visible
      }
    );

    observer.observe(container);

    // Cleanup
    return () => {
      observer.disconnect();
      video.pause();
      video.currentTime = 0;
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-card">
      <video
        ref={videoRef}
        className={cn(
          "w-full h-full object-cover",
          isLocked && "scale-105 transition-all duration-500 group-hover:scale-110"
        )}
        poster={posterUrl || undefined}
        loop
        muted
        playsInline
        preload="metadata"
      >
        {/* WebM first for better performance */}
        <source src={webmUrl} type="video/webm" />
        {/* MP4 fallback for Safari/older browsers */}
        <source src={mp4Url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

interface ProfileGalleryProps {
  items: GalleryItem[];
  modelName: string;
  modelSlug: string;
  encodedDestination: string;
  isCrawler: boolean;
  isVerified: boolean;
  modelId: string;
}

export function ProfileGallery({
  items,
  modelName,
  modelSlug,
  encodedDestination,
  isCrawler,
  isVerified,
  modelId
}: ProfileGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [decodedUrl, setDecodedUrl] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { trackClick } = useAnalytics();

  // Ensure component is mounted on client (hydration safety)
  useEffect(() => {
    setIsMounted(true);

    // Force recalculation of scroll positions after mount
    const container = scrollContainerRef.current;
    if (container) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        // Trigger a reflow to ensure styles are applied
        container.style.display = 'none';
        container.offsetHeight; // Force reflow
        container.style.display = 'flex';
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // Hydration-safe decoding for humans only
  useEffect(() => {
    if (!isCrawler && encodedDestination) {
      setDecodedUrl(decodeDestination(encodedDestination));
    }
  }, [isCrawler, encodedDestination]);

  const handleLockedClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isCrawler || !decodedUrl) {
      // Do nothing for crawlers except track the attempt if desired
      await trackClick('content', {
        modelId,
        modelSlug,
        pagePath: `/model/${modelSlug}`,
      });
      return;
    }

    // Track human intent before redirect
    await trackClick('content', {
      modelId,
      modelSlug,
      pagePath: `/model/${modelSlug}`,
    });

    window.open(decodedUrl, '_blank', 'noopener,noreferrer');
  };

  // Filter valid items (must have media_url)
  const validItems = items.filter(item => item && item.media_url && item.media_url.trim() !== '');

  // Track current slide based on scroll position
  useEffect(() => {
    if (!isMounted) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      if (containerWidth > 0) {
        const currentIndex = Math.round(scrollLeft / containerWidth);
        setCurrent(currentIndex);
      }
    };

    // Use requestAnimationFrame for smoother tracking
    let rafId: number;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', onScroll);
    };
  }, [isMounted, validItems.length]);

  // Helper: derive WebM URL from Video URL
  const deriveWebmUrl = (url: string): string => {
    const videoExts = ['.mp4', '.mov', '.avi', '.wmv', '.mkv', '.m4v'];
    for (const ext of videoExts) {
      if (url.toLowerCase().endsWith(ext)) {
        return url.slice(0, -ext.length) + '.webm';
      }
    }
    const parts = url.split('.');
    if (parts.length > 1) {
      parts.pop();
      return parts.join('.') + '.webm';
    }
    return url + '.webm';
  };

  if (validItems.length === 0) {
    return (
      <div className="relative w-full aspect-[3/4] lg:aspect-auto bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No images available</p>
      </div>
    );
  }

  // Build slides array from gallery items
  const allSlides = [
    ...validItems.map((item, index) => ({
      type: item.media_type as 'image' | 'video',
      url: getImageUrl(item.media_url),
      posterUrl: item.poster_url ? getImageUrl(item.poster_url) : null,
      key: `${item.media_type}-${item.id || index}`,
    })),
  ];

  // Scroll to specific slide
  const scrollToSlide = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    container.scrollTo({
      left: index * containerWidth,
      behavior: 'smooth'
    });
  };

  const scrollPrev = () => {
    if (current > 0) scrollToSlide(current - 1);
  };

  const scrollNext = () => {
    if (current < allSlides.length - 1) scrollToSlide(current + 1);
  };

  // Render media element (image or video)
  const renderMedia = (
    slide: { type: 'image' | 'video'; url: string | null; posterUrl: string | null },
    index: number
  ) => {
    // Check if this is the last gallery item (becomes the locked VIP teaser)
    const isLastItem = index === validItems.length - 1;

    // Render locked VIP teaser for last item
    if (isLastItem) {
      const teaserContent = (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[10px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

          <div className="relative z-10 flex flex-col items-center w-full">
            <div className="rounded-full bg-black/60 backdrop-blur-[13px] p-4 mb-4 border-2 border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Lock className="h-7 w-7 text-[#D4AF37]" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-sans font-semibold text-white mb-5">
              {isCrawler ? "Premium Content" : "Want to see more?"}
            </h3>

            <div
              onClick={handleLockedClick}
              className={cn(
                "px-7 py-3.5 rounded-full bg-black/50 backdrop-blur-[19px] text-[#D4AF37] font-semibold border-2 border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.25)] transition-all duration-300",
                !isCrawler && "hover:bg-black/60 hover:border-[#D4AF37]/60 hover:scale-[1.02] cursor-pointer"
              )}
            >
              {isCrawler ? "Premium Content" : "Unlock VIP Content"}
            </div>
          </div>
        </div>
      );

      if (slide.type === 'video' && slide.url) {
        return (
          <div className="relative w-full h-full overflow-hidden group bg-card">
            <VideoPlayer mp4Url={slide.url} webmUrl={deriveWebmUrl(slide.url)} posterUrl={slide.posterUrl} isLocked={true} />
            {teaserContent}
          </div>
        );
      }

      if (slide.url) {
        return (
          <div className="relative w-full h-full overflow-hidden group bg-card">
            <Image
              src={slide.url}
              alt={`Model ${modelName} profile photo`}
              fill
              className="object-cover scale-105 transition-all duration-500 group-hover:scale-110"
              sizes="(max-width: 1024px) 100vw, 450px"
              priority={false}
            />
            {teaserContent}
          </div>
        );
      }
    }

    // Regular items
    if (slide.type === 'video' && slide.url) {
      return <VideoPlayer mp4Url={slide.url} webmUrl={deriveWebmUrl(slide.url)} posterUrl={slide.posterUrl} />;
    }

    if (slide.url) {
      return (
        <div className="relative w-full h-full bg-card">
          <Image
            src={slide.url}
            alt={`Model ${modelName} gallery image ${index + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 450px"
            priority={index === 0}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Mobile Carousel */}
      <div ref={containerRef} className="relative w-full aspect-[3/4] group overflow-hidden lg:hidden">
        <div ref={scrollContainerRef} className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide gallery-scroll-container overscroll-x-contain">
          {allSlides.map((slide, index) => (
            <div key={slide.key} className="h-full gallery-slide bg-card">
              {renderMedia(slide, index)}
            </div>
          ))}
        </div>

        <div className="hidden md:block lg:hidden absolute inset-0 pointer-events-none z-50">
          <button onClick={scrollPrev} disabled={current === 0} className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/10 text-white disabled:opacity-50">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={scrollNext} disabled={current === allSlides.length - 1} className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/10 text-white disabled:opacity-50">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-40" style={{ background: 'linear-gradient(to top, #050A14 0%, #050A14 15%, rgba(5, 10, 20, 0.85) 30%, rgba(5, 10, 20, 0.60) 50%, rgba(5, 10, 20, 0.30) 70%, rgba(5, 10, 20, 0.10) 85%, transparent 100%)' }} />

        {allSlides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
            {allSlides.map((_, index) => (
              <button key={index} onClick={() => scrollToSlide(index)} className={cn("h-1.5 rounded-full transition-all duration-300", current === index ? "w-8 bg-white" : "w-2 bg-white/40")} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop Vertical Stack */}
      <div className="hidden lg:flex lg:flex-col w-full gap-6">
        {allSlides.map((slide, index) => (
          <div key={slide.key} className={cn("w-full rounded-xl overflow-hidden bg-card", slide.type === 'video' ? "aspect-video" : "aspect-[3/4]")}>
            {renderMedia(slide, index)}
          </div>
        ))}
      </div>
    </>
  );
}
