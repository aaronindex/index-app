// lib/utm.ts
// UTM parameter persistence and tracking utilities

const UTM_STORAGE_KEY = 'index_utm_params';
const UTM_EXPIRY_DAYS = 30; // Store UTM params for 30 days

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  captured_at: string; // ISO timestamp
}

/**
 * Capture UTM parameters from URL and store in localStorage
 * Call this on landing page or any entry point
 */
export function captureUTMParams(): UTMParams | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  const utmParams: Partial<UTMParams> = {
    captured_at: new Date().toISOString(),
  };

  // Extract all UTM params
  const utmSource = url.searchParams.get('utm_source');
  const utmMedium = url.searchParams.get('utm_medium');
  const utmCampaign = url.searchParams.get('utm_campaign');
  const utmTerm = url.searchParams.get('utm_term');
  const utmContent = url.searchParams.get('utm_content');

  if (utmSource) utmParams.utm_source = utmSource;
  if (utmMedium) utmParams.utm_medium = utmMedium;
  if (utmCampaign) utmParams.utm_campaign = utmCampaign;
  if (utmTerm) utmParams.utm_term = utmTerm;
  if (utmContent) utmParams.utm_content = utmContent;

  // Only store if we have at least one UTM param
  if (utmSource || utmMedium || utmCampaign || utmTerm || utmContent) {
    try {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmParams as UTMParams));
      return utmParams as UTMParams;
    } catch (error) {
      console.error('Failed to store UTM params:', error);
      return null;
    }
  }

  return null;
}

/**
 * Get stored UTM parameters (if not expired)
 * Returns null if no params stored or if expired
 */
export function getStoredUTMParams(): UTMParams | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const params = JSON.parse(stored) as UTMParams;
    const capturedAt = new Date(params.captured_at);
    const now = new Date();
    const daysSinceCapture = (now.getTime() - capturedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Check if expired
    if (daysSinceCapture > UTM_EXPIRY_DAYS) {
      localStorage.removeItem(UTM_STORAGE_KEY);
      return null;
    }

    return params;
  } catch (error) {
    console.error('Failed to read UTM params:', error);
    return null;
  }
}

/**
 * Clear stored UTM parameters
 * Useful after signup completion or when attribution is no longer needed
 */
export function clearUTMParams(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(UTM_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear UTM params:', error);
  }
}

/**
 * Get UTM params for analytics events
 * Returns stored params if available, otherwise current URL params
 */
export function getUTMParamsForAnalytics(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
} {
  // First try stored params (for attribution across sessions)
  const stored = getStoredUTMParams();
  if (stored) {
    return {
      utm_source: stored.utm_source,
      utm_medium: stored.utm_medium,
      utm_campaign: stored.utm_campaign,
      utm_term: stored.utm_term,
      utm_content: stored.utm_content,
    };
  }

  // Fallback to current URL params
  if (typeof window === 'undefined') {
    return {};
  }

  const url = new URL(window.location.href);
  const params: Record<string, string | undefined> = {};

  const utmSource = url.searchParams.get('utm_source');
  const utmMedium = url.searchParams.get('utm_medium');
  const utmCampaign = url.searchParams.get('utm_campaign');
  const utmTerm = url.searchParams.get('utm_term');
  const utmContent = url.searchParams.get('utm_content');

  if (utmSource) params.utm_source = utmSource;
  if (utmMedium) params.utm_medium = utmMedium;
  if (utmCampaign) params.utm_campaign = utmCampaign;
  if (utmTerm) params.utm_term = utmTerm;
  if (utmContent) params.utm_content = utmContent;

  return params;
}

