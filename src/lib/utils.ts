import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// R2 Domain constants - separate buckets for main images and stories
// Ensure domains have https:// prefix
const getMainDomain = () => {
  const domain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev';
  return domain.startsWith('http') ? domain : `https://${domain}`;
};

const getStoriesDomain = () => {
  const domain = process.env.NEXT_PUBLIC_R2_STORIES_DOMAIN || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev';
  return domain.startsWith('http') ? domain : `https://${domain}`;
};

const MAIN_DOMAIN = getMainDomain();
const STORIES_DOMAIN = getStoriesDomain();

/**
 * Converts a relative R2 path to a full URL, or returns the URL as-is if it's already a full URL.
 * Routes to different buckets based on path prefix:
 * - Paths starting with 'stories/' use STORIES_DOMAIN
 * - All other paths use MAIN_DOMAIN
 * 
 * @param path - Relative path (e.g., "stories/img.jpg" or "models/photo.jpg") or full URL (e.g., "https://...")
 * @returns Full URL string
 * 
 * @example
 * getImageUrl("stories/img.jpg") // Uses STORIES_DOMAIN
 * getImageUrl("models/photo.jpg") // Uses MAIN_DOMAIN
 * getImageUrl("https://example.com/img.jpg") // Returns as-is (legacy support)
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }

  // If path already starts with http/https, return as-is (legacy support)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Determine which domain to use based on path prefix
  const domain = path.startsWith('stories/') ? STORIES_DOMAIN : MAIN_DOMAIN;
  const fullUrl = `${domain}/${path}`;
  
  // Debug logging (remove in production if needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('getImageUrl:', {
      path,
      isStories: path.startsWith('stories/'),
      domain,
      fullUrl,
      NEXT_PUBLIC_R2_STORIES_DOMAIN: process.env.NEXT_PUBLIC_R2_STORIES_DOMAIN,
      NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    });
  }
  
  return fullUrl;
}