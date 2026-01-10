"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn, getImageUrl } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";
import type { GalleryItem } from "@/types";

// Video Player Component with Intersection Observer
interface VideoPlayerProps {
  mp4Url: string;
  webmUrl: string;
  posterUrl: string | null;
}

function VideoPlayer({ mp4Url, webmUrl, posterUrl }: VideoPlayerProps) {
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
    <div ref={containerRef} className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
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
  name: string;
  socialLink: string;
  modelId: string;
}

export function ProfileGallery({ items, name, socialLink, modelId }: ProfileGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
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

  const handleUnlockClick = async () => {
    await trackClick(modelId, 'content');
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
    if (current > 0) {
      scrollToSlide(current - 1);
    }
  };

  const scrollNext = () => {
    const totalSlides = allSlides.length;
    if (current < totalSlides - 1) {
      scrollToSlide(current + 1);
    }
  };

  // Helper: derive WebM URL from MP4 URL
  const deriveWebmUrl = (mp4Url: string): string => {
    // Replace .mp4 extension with .webm
    if (mp4Url.endsWith('.mp4')) {
      return mp4Url.replace(/\.mp4$/, '.webm');
    }
    // If not ending in .mp4, append .webm as fallback
    return mp4Url + '.webm';
  };

  if (validItems.length === 0) {
    return (
      <div className="relative w-full aspect-[3/4] lg:aspect-auto bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">No images available</p>
      </div>
    );
  }

  // Build slides array from gallery items + end card
  const allSlides = [
    ...validItems.map((item, index) => ({
      type: item.media_type as 'image' | 'video',
      url: getImageUrl(item.media_url),
      posterUrl: item.poster_url ? getImageUrl(item.poster_url) : null,
      key: `${item.media_type}-${item.id || index}`,
    })),
    {
      type: "end-card" as const,
      url: null,
      posterUrl: null,
      key: "end-card",
    },
  ];

  // Render media element (image or video)
  const renderMedia = (
    slide: { type: 'image' | 'video' | 'end-card'; url: string | null; posterUrl: string | null },
    index: number,
    isDesktop: boolean
  ) => {
    if (slide.type === 'end-card') {
      return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-black/90 via-purple-900/80 to-pink-900/80 backdrop-blur-sm">
          <div className="text-center space-y-6 z-10 max-w-md">
            <h2 className="text-3xl font-bold text-white">Want to see more of {name}?</h2>
            <p className="text-white/90">Unlock exclusive content and personalized interactions</p>
            {socialLink && socialLink.trim() !== '' && socialLink !== '#' ? (
              <a
                href={socialLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleUnlockClick}
                className="h-16 px-8 text-lg font-bold rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/50 transition-all transform hover:scale-105 animate-pulse flex items-center justify-center"
              >
                Unlock Exclusive Content
              </a>
            ) : null}
          </div>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
        </div>
      );
    }

    if (slide.type === 'video' && slide.url) {
      const mp4Url = slide.url;
      const webmUrl = deriveWebmUrl(mp4Url);
      
      return (
        <VideoPlayer
          mp4Url={mp4Url}
          webmUrl={webmUrl}
          posterUrl={slide.posterUrl}
        />
      );
    }

    // Default: Image
    if (slide.url) {
      return (
        <div className="relative w-full h-full">
          <Image
            src={slide.url}
            alt={`${name} - Image ${index + 1}`}
            fill
            className="object-cover"
            sizes={isDesktop ? "(min-width: 1024px) 66vw, 100vw" : "100vw"}
            priority={index === 0}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Mobile Carousel - Hidden on desktop (lg+) */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-[3/4] group overflow-hidden lg:hidden"
      >
        {/* Scroll Container with CSS Scroll Snap */}
        <div
          ref={scrollContainerRef}
          className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide gallery-scroll-container overscroll-x-contain"
        >
          {allSlides.map((slide, index) => (
            <div
              key={slide.key}
              className="h-full gallery-slide"
            >
              {renderMedia(slide, index, false)}
            </div>
          ))}
        </div>

        {/* Glassmorphism Desktop Arrows - Hidden on mobile */}
        <div className="hidden md:block lg:hidden absolute inset-0 pointer-events-none z-50">
          <button
            onClick={scrollPrev}
            disabled={current === 0}
            className={cn(
              "pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2",
              "h-12 w-12 rounded-full flex items-center justify-center",
              "bg-white/20 backdrop-blur-sm border border-white/10",
              "text-white hover:bg-white/40 transition-colors",
              "shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Previous slide"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={scrollNext}
            disabled={current === allSlides.length - 1}
            className={cn(
              "pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2",
              "h-12 w-12 rounded-full flex items-center justify-center",
              "bg-white/20 backdrop-blur-sm border border-white/10",
              "text-white hover:bg-white/40 transition-colors",
              "shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Next slide"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Pagination Dots */}
        {allSlides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
            {allSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToSlide(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  current === index ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop Vertical Stack - Hidden on mobile, visible on lg+ */}
      <div className="hidden lg:flex lg:flex-col w-full lg:pt-0 gap-6">
        {allSlides.map((slide, index) => (
          <div 
            key={slide.key} 
            className={cn(
              "w-full rounded-xl overflow-hidden",
              // Use aspect ratio based on media type for consistent layout
              slide.type === 'video' ? "aspect-video" : "aspect-[3/4]"
            )}
          >
            {renderMedia(slide, index, true)}
          </div>
        ))}
      </div>
    </>
  );
}
