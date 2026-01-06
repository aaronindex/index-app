// lib/analytics.ts
// GA4 event tracking via GTM dataLayer
// Safe for browser-only use - no server-side execution

/**
 * Track a GA4 event via GTM dataLayer
 * Only executes in browser environment
 * 
 * @param name Event name (e.g., 'button_click', 'form_submit')
 * @param params Event parameters (must be primitives: string, number, boolean, or small objects)
 */
export function trackEvent(name: string, params?: Record<string, any>): void {
  // Only execute in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Check if dataLayer exists
  const dataLayer = (window as any).dataLayer;
  if (!dataLayer || !Array.isArray(dataLayer)) {
    // dataLayer not initialized yet - skip silently
    return;
  }

  // Build event object
  const eventData: Record<string, any> = {
    event: name,
  };

  // Add params if provided (sanitize to ensure only primitives)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      // Only include primitive values or small objects
      if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        (typeof value === 'object' && Object.keys(value).length <= 10) // Small objects only
      ) {
        eventData[key] = value;
      }
    }
  }

  // Push to dataLayer
  dataLayer.push(eventData);

  // Debug logging in development
  if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === 'true') {
    console.log('[Analytics]', name, params || {});
  }
}

