import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['openai'],
  // Disable service worker generation to avoid __dirname issues
  // If you need PWA, configure it properly with a custom service worker
  experimental: {
    // This prevents Next.js from auto-generating service workers
  },
  // Suppress middleware deprecation warning (middleware.ts is still correct for Next.js 16)
  onDemandEntries: {
    // Keep pages in memory for faster HMR
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
