// middleware.ts
// Note: Next.js 16 shows a deprecation warning for middleware.ts in favor of proxy.ts,
// but proxy.ts may not be fully stable yet. Keeping middleware.ts for now.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    // Check for required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Return early if env vars are missing - don't try to use Supabase
      return NextResponse.next({ request });
    }

    // Log that we're starting middleware (for debugging)
    console.log('[Middleware] Starting for path:', request.nextUrl.pathname);

    let supabaseResponse = NextResponse.next({
      request,
    });

    console.log('[Middleware] Creating Supabase client');
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            supabaseResponse = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            supabaseResponse.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            supabaseResponse = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            supabaseResponse.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    let user = null;
    try {
      console.log('[Middleware] Getting user');
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
      console.log('[Middleware] User:', user ? 'authenticated' : 'not authenticated');
    } catch (error) {
      // Log the error details
      console.error('[Middleware] Error getting user:', error);
      console.error('[Middleware] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[Middleware] Error message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('[Middleware] Error stack:', error.stack);
      }
      // Continue without user if there's an error
      return NextResponse.next({ request });
    }

    const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
    const isProtectedRoute =
      request.nextUrl.pathname.startsWith('/projects') ||
      request.nextUrl.pathname.startsWith('/toolbelt');

    // Redirect to sign in if accessing protected route without auth
    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Redirect to home if accessing auth pages while authenticated
    if (user && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    console.log('[Middleware] Successfully completed');
    return supabaseResponse;
  } catch (error) {
    // Log comprehensive error details
    console.error('[Middleware] Fatal error:', error);
    console.error('[Middleware] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[Middleware] Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[Middleware] Error stack:', error.stack);
    }
    // Log error properties
    if (error instanceof Error) {
      console.error('[Middleware] Error name:', error.name);
      console.error('[Middleware] Error cause:', error.cause);
    }
    // If anything fails, just continue with the request
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

