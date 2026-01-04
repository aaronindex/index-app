// middleware.ts
// Edge-safe middleware for Next.js - runs on Vercel Edge runtime
// IMPORTANT: This file must ONLY use Edge-compatible APIs (no Node.js APIs like __dirname, fs, path, etc.)
// We avoid @supabase/ssr in middleware as it may pull in Node.js dependencies

import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge-safe user check by parsing Supabase auth cookies
 * Supabase stores auth in cookies with pattern: sb-<project-ref>-auth-token
 * We extract the project ref from NEXT_PUBLIC_SUPABASE_URL and check for the cookie
 * Then parse the JWT to validate the user (Edge-safe, no Node.js dependencies)
 */
async function checkUserAuth(request: NextRequest): Promise<{ user: any | null; error: Error | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: null };
  }

  try {
    // Extract project ref from Supabase URL (e.g., https://xyz.supabase.co -> xyz)
    const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
    const projectRef = urlMatch ? urlMatch[1] : null;
    
    if (!projectRef) {
      return { user: null, error: null };
    }

    // Supabase cookie name pattern: sb-<project-ref>-auth-token
    const cookieName = `sb-${projectRef}-auth-token`;
    const authCookie = request.cookies.get(cookieName)?.value;
    
    if (!authCookie) {
      return { user: null, error: null };
    }

    // Parse the cookie value (it's a JSON string containing access_token and refresh_token)
    let tokenData;
    try {
      tokenData = JSON.parse(authCookie);
    } catch {
      // If parsing fails, try treating it as a direct token
      tokenData = { access_token: authCookie };
    }

    const accessToken = tokenData.access_token || tokenData;
    
    if (!accessToken || typeof accessToken !== 'string') {
      return { user: null, error: null };
    }

    // Parse JWT to get user info (Edge-safe, uses only Web APIs)
    // JWT format: header.payload.signature
    try {
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        return { user: null, error: null };
      }

      // Decode base64 payload (Edge-safe)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return { user: null, error: null };
      }
      
      // Return minimal user info from JWT payload
      return { 
        user: { 
          id: payload.sub || payload.user_id,
          email: payload.email 
        }, 
        error: null 
      };
    } catch (parseError) {
      // If JWT parsing fails, token is invalid - return no user
      return { user: null, error: null };
    }
  } catch (error) {
    // On any error, return no user (fail open for middleware)
    return { 
      user: null, 
      error: error instanceof Error ? error : new Error('Failed to check auth') 
    };
  }
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    
    // Minimal Edge-safe logging
    console.log('[Middleware] Path:', pathname);

    // Check for required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Return early if env vars are missing
      return NextResponse.next({ request });
    }

    // Create response object
    const response = NextResponse.next({ request });

    // Check user auth using Edge-safe method
    const { user, error } = await checkUserAuth(request);
    
    if (error) {
      console.error('[Middleware] Auth check error:', error.message);
      // Continue without user if there's an error
      return response;
    }

    const isAuthPage = pathname.startsWith('/auth');
    const isProtectedRoute =
      pathname.startsWith('/projects') ||
      pathname.startsWith('/toolbelt');

    // Redirect to sign in if accessing protected route without auth
    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Redirect to home if accessing auth pages while authenticated
    if (user && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    return response;
  } catch (error) {
    // Log error but don't crash - always return a response
    console.error('[Middleware] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api/* (API routes run in Node.js runtime, not Edge - they have their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - Image files
     * 
     * NOTE: We exclude /api/* to prevent middleware from running on API routes
     * which may use Node.js-only dependencies
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
