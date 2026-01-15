// lib/analytics/track.ts
// Client-side analytics tracking via dataLayer
// Extends existing analytics.ts with event_id and UTM attribution

import { getStoredAttribution } from './attribution';

/**
 * Generate a unique event ID for deduplication
 */
export function generateEventId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get UTM params from stored attribution for analytics events
 */
function getUTMParamsForEvent(): Record<string, string | undefined> {
  const attribution = getStoredAttribution();
  if (!attribution) {
    return {};
  }

  return {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
  };
}

/**
 * Track an event via dataLayer
 * Automatically includes event_id and UTM params if available
 * NEVER includes PII (email, names, Stripe IDs)
 */
export function track(
  eventName: string,
  params: Record<string, any> = {}
): void {
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
    event: eventName,
    event_id: generateEventId(),
  };

  // Add UTM params if available
  const utmParams = getUTMParamsForEvent();
  Object.keys(utmParams).forEach((key) => {
    if (utmParams[key]) {
      eventData[key] = utmParams[key];
    }
  });

  // Add provided params (sanitize to ensure no PII)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      // Skip PII fields
      if (
        key.toLowerCase().includes('email') ||
        key.toLowerCase().includes('name') ||
        key.toLowerCase().includes('stripe') ||
        key === 'user_id' ||
        key === 'customer_id'
      ) {
        continue;
      }

      // Only include primitive values or small objects
      if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        (typeof value === 'object' && Object.keys(value).length <= 10)
      ) {
        eventData[key] = value;
      }
    }
  }

  // Push to dataLayer
  dataLayer.push(eventData);

  // Debug logging in development
  if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === 'true') {
    console.log('[Analytics]', eventName, eventData);
  }
}

