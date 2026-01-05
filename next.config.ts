import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['openai', '@supabase/ssr'],
  // Disable service worker generation to avoid __dirname issues
  // If you need PWA, configure it properly with a custom service worker
  experimental: {
    // This prevents Next.js from auto-generating service workers
  },
};

export default nextConfig;
