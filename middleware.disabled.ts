// middleware.ts
// Edge-safe middleware - minimal implementation to avoid __dirname errors
// Only uses Next.js server types - no other imports

import { NextResponse, type NextRequest } from 'next/server';

/**
 * Minimal auth check - just checks if auth cookie exists
 * No JWT parsing to avoid any potential bundling issues
 */
function hasAuthCookie(request: NextRequest): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!supabaseUrl) {
    return false;
  }

  try {
    // Extract project ref from URL
    const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
    const projectRef = urlMatch ? urlMatch[1] : null;
    
    if (!projectRef) {
      return false;
    }

    // Check if auth cookie exists
    const cookieName = `sb-${projectRef}-auth-token`;
    const authCookie = request.cookies.get(cookieName);
    
    return !!authCookie?.value;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    
    // Skip if env vars missing
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.next({ request });
    }

    // Simple auth check - just cookie existence
    const hasAuth = hasAuthCookie(request);

    const isAuthPage = pathname.startsWith('/auth');
    const isProtectedRoute =
      pathname.startsWith('/projects') ||
      pathname.startsWith('/toolbelt');

    // Redirect logic
    if (!hasAuth && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    if (hasAuth && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  } catch (error) {
    // Always return a response
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    // Exclude API routes, Next.js internals, static files, and images
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
