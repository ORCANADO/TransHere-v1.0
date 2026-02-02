import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Optimize image formats: AVIF is smaller than WebP, WebP is fallback
    formats: ['image/avif', 'image/webp'],
    // 1-year cache TTL to align with R2 aggressive caching strategy
    minimumCacheTTL: 31536000,
    // Optimized breakpoints matching actual display sizes
    deviceSizes: [375, 450, 640, 828, 1080, 1920],
    imageSizes: [72, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "pub-7a8adad1ccfc4f0db171158b6cf5c030.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        // Cloudflare Pages domains (for deployment previews)
        hostname: "*.pages.dev",
      },
    ],
  },
};

export default nextConfig;