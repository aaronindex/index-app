// lib/error-handling.ts
// Centralized error handling and logging utilities

import { showError, showSuccess, showInfo, showWarning } from '@/app/components/ErrorNotification';

// Re-export for convenience
export { showError, showSuccess, showInfo, showWarning };

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

/**
 * Handle API errors with user-friendly messages
 */
export async function handleApiError(response: Response): Promise<ApiError> {
  let errorData: ApiError;
  
  try {
    errorData = await response.json();
  } catch {
    errorData = {
      error: `Request failed with status ${response.status}`,
      code: response.status.toString(),
    };
  }

  // Log error for debugging
  console.error('[API Error]', {
    status: response.status,
    url: response.url,
    error: errorData,
  });

  // Show user-friendly error message
  const userMessage = getUserFriendlyErrorMessage(errorData, response.status);
  showError(userMessage);

  return errorData;
}

/**
 * Convert technical errors to user-friendly messages
 */
function getUserFriendlyErrorMessage(error: ApiError, status: number): string {
  // Check for specific error messages first
  if (error.error) {
    // Common user-facing errors
    if (error.error.includes('not found')) {
      return 'The requested item could not be found.';
    }
    if (error.error.includes('Unauthorized') || error.error.includes('unauthorized')) {
      return 'You need to sign in to perform this action.';
    }
    if (error.error.includes('permission') || error.error.includes('forbidden')) {
      return "You don't have permission to perform this action.";
    }
    if (error.error.includes('validation') || error.error.includes('invalid')) {
      return `Invalid input: ${error.error}`;
    }
    if (error.error.includes('network') || error.error.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Return the error message if it's already user-friendly
    return error.error;
  }

  // Fallback to status code messages
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'You need to sign in to perform this action.';
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return 'The requested item could not be found.';
    case 409:
      return 'This item already exists or conflicts with existing data.';
    case 422:
      return 'Invalid input. Please check your data and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Server error. Please try again in a moment.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Wrapper for API calls with automatic error handling
 */
export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      await handleApiError(response);
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError('Network error. Please check your connection and try again.');
    } else if (error instanceof Error && !error.message.includes('API call failed')) {
      showError(error.message);
    }
    throw error;
  }
}

/**
 * Log errors for debugging (can be extended to send to logging service)
 */
export function logError(error: Error | unknown, context?: string) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error('[Error Log]', {
    context,
    message: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  });

  // TODO: In production, send to error tracking service (e.g., Sentry, LogRocket)
  // if (process.env.NODE_ENV === 'production') {
  //   // Send to error tracking service
  // }
}

