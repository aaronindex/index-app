// middleware.ts
// Ultra-minimal Edge-safe middleware
// NO imports except Next.js server types
// NO cookie parsing, NO JWT, NO dependencies

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Minimal middleware - just pass through
  // Auth checks happen in page components, not middleware
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    // Only match specific routes that need middleware
    // Exclude everything else to minimize bundling
    '/',
    '/home',
    '/auth/:path*',
    '/projects/:path*',
  ],
};

