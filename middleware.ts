// middleware.ts
// Minimal middleware - matches routes but does nothing
// This prevents 404s while avoiding __dirname errors
// All auth is handled in page components

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Do nothing - just pass through
  // Auth checks happen in page components (app/page.tsx, app/home/page.tsx, etc.)
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    // Match all routes except API, static files, and images
    // This ensures middleware runs but does nothing
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
