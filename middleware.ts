// middleware.ts
// TEMPORARILY DISABLED - handling auth in page components instead
// This file exists to prevent 404s but does nothing
// Auth is handled in app/page.tsx and app/home/page.tsx

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Pass through - all auth logic moved to page components
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    // Match nothing - effectively disable middleware
    '/__never_match__',
  ],
};
