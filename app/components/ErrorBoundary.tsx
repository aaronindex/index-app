// app/components/ErrorBoundary.tsx
'use client';

import React from 'react';
import { showError } from './ErrorNotification';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for client-side debugging
    console.error('[Error Boundary]', error, errorInfo);
    
    // Log to server via API for Vercel logs visibility
    const errorContext = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      appEnv: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'unknown',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      stripeEnabled: process.env.NEXT_PUBLIC_STRIPE_ENABLED || process.env.STRIPE_ENABLED || 'not-set',
      timestamp: new Date().toISOString(),
    };
    
    // Fire-and-forget error logging to server
    fetch('/api/debug/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorContext),
    }).catch(() => {
      // Silently fail - don't create error loops
    });
    
    showError('Something went wrong. Please refresh the page.');
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[rgb(var(--bg))]">
          <div className="max-w-md w-full text-center">
            <h2 className="font-serif text-2xl font-semibold text-[rgb(var(--text))] mb-4">
              Something went wrong
            </h2>
            <p className="text-[rgb(var(--muted))] mb-6">
              An unexpected error occurred. Please refresh the page or try again.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

