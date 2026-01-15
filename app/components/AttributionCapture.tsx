// app/components/AttributionCapture.tsx
// Client component to capture attribution on app shell (signed-in users)

'use client';

import { useEffect } from 'react';
import { captureAttribution, getStoredAttribution } from '@/lib/analytics/attribution';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function AttributionCapture() {
  useEffect(() => {
    // Capture attribution on first load (if not already captured)
    captureAttribution();

    // If user is signed in and attribution exists, attach to profile
    const attachAttribution = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const attribution = getStoredAttribution();
      if (!attribution) {
        return;
      }

      // Attach to profile (first-touch only, handled server-side)
      try {
        await fetch('/api/attribution/attach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utm_source: attribution.utm_source,
            utm_medium: attribution.utm_medium,
            utm_campaign: attribution.utm_campaign,
            utm_content: attribution.utm_content,
            utm_term: attribution.utm_term,
            initial_referrer: attribution.initial_referrer,
            initial_landing_path: attribution.initial_landing_path,
          }),
        });
      } catch (error) {
        console.error('Failed to attach attribution:', error);
      }
    };

    attachAttribution();
  }, []);

  return null;
}

