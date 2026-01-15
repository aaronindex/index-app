// lib/analytics/attribution.ts
// Attribution persistence and profile attachment
// Extends existing UTM handling with first-touch persistence

const ATTRIBUTION_STORAGE_KEY = 'index_attribution_v1';

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  initial_referrer?: string;
  initial_landing_path?: string;
  captured_at: string; // ISO timestamp
}

/**
 * Capture attribution data on first landing (first-touch only)
 * Stores in localStorage if not already set
 */
export function captureAttribution(): AttributionData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // Check if attribution already captured (first-touch only)
  const existing = getStoredAttribution();
  if (existing) {
    return existing;
  }

  const url = new URL(window.location.href);
  const attribution: AttributionData = {
    captured_at: new Date().toISOString(),
  };

  // Extract UTM params
  const utmSource = url.searchParams.get('utm_source');
  const utmMedium = url.searchParams.get('utm_medium');
  const utmCampaign = url.searchParams.get('utm_campaign');
  const utmTerm = url.searchParams.get('utm_term');
  const utmContent = url.searchParams.get('utm_content');

  if (utmSource) attribution.utm_source = utmSource;
  if (utmMedium) attribution.utm_medium = utmMedium;
  if (utmCampaign) attribution.utm_campaign = utmCampaign;
  if (utmTerm) attribution.utm_term = utmTerm;
  if (utmContent) attribution.utm_content = utmContent;

  // Capture referrer and pathname
  if (document.referrer) {
    attribution.initial_referrer = document.referrer;
  }
  attribution.initial_landing_path = window.location.pathname;

  // Store if we have any attribution data
  if (
    attribution.utm_source ||
    attribution.utm_medium ||
    attribution.utm_campaign ||
    attribution.utm_term ||
    attribution.utm_content ||
    attribution.initial_referrer
  ) {
    try {
      localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
      return attribution;
    } catch (error) {
      console.error('Failed to store attribution:', error);
      return null;
    }
  }

  return null;
}

/**
 * Get stored attribution data
 */
export function getStoredAttribution(): AttributionData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as AttributionData;
  } catch (error) {
    console.error('Failed to read attribution:', error);
    return null;
  }
}

/**
 * Clear stored attribution (after profile attachment)
 */
export function clearAttribution(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear attribution:', error);
  }
}

