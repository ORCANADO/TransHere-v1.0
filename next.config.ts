import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Use Cloudflare Image Resizing instead of Next.js /_next/image proxy
    // (Next.js image optimization doesn't work on Cloudflare Pages)
    loader: 'custom',
    loaderFile: './src/lib/cloudflare-image-loader.ts',
    // Optimized breakpoints matching actual display sizes
    deviceSizes: [375, 450, 640, 828, 1080, 1920],
    imageSizes: [72, 96, 128, 256, 384],
  },
};

export default nextConfig;