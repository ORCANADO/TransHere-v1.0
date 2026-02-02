/**
 * Cloudflare Image Resizing loader for Next.js
 *
 * Replaces the default /_next/image proxy (which doesn't resize on Cloudflare Pages)
 * with Cloudflare's /cdn-cgi/image/ endpoint that actually resizes, compresses,
 * and serves images in AVIF/WebP format.
 *
 * URL format: /cdn-cgi/image/width=X,quality=Y,format=auto,fit=cover/<SOURCE_URL>
 *
 * @see https://developers.cloudflare.com/images/transform-images/transform-via-url/
 */

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudflareImageLoader({ src, width, quality }: ImageLoaderParams): string {
  // Default quality if not specified
  const q = quality || 75;

  // Build Cloudflare Image Resizing URL
  // format=auto lets Cloudflare serve AVIF/WebP based on browser support
  // fit=cover maintains aspect ratio and crops to fill
  const params = `width=${width},quality=${q},format=auto,fit=cover,onerror=redirect`;

  // In development, fall back to the raw URL (no Cloudflare CDN available locally)
  if (process.env.NODE_ENV === 'development') {
    return src;
  }

  // Use relative /cdn-cgi/image/ path (works on the same Cloudflare zone)
  return `/cdn-cgi/image/${params}/${src}`;
}
