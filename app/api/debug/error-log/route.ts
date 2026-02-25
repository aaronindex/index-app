// app/api/debug/error-log/route.ts
// Server-side error logging endpoint for ErrorBoundary
// Logs errors to Vercel logs with context

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const errorContext = await request.json();
    
    // Log to server console (visible in Vercel logs)
    console.error('[ErrorBoundary] Client-side error caught:', {
      message: errorContext.message,
      route: errorContext.route,
      appEnv: errorContext.appEnv,
      hasSupabaseUrl: errorContext.hasSupabaseUrl,
      hasSupabaseAnonKey: errorContext.hasSupabaseAnonKey,
      stripeEnabled: errorContext.stripeEnabled,
      timestamp: errorContext.timestamp,
      stack: errorContext.stack?.split('\n').slice(0, 10).join('\n'), // First 10 lines of stack
      componentStack: errorContext.componentStack?.split('\n').slice(0, 5).join('\n'), // First 5 lines
    });
    
    return NextResponse.json({ logged: true });
  } catch (error) {
    // Don't fail if logging fails
    console.error('[ErrorBoundary] Failed to log error:', error);
    return NextResponse.json({ logged: false }, { status: 500 });
  }
}
