# SEO & UTM Parameter Tracking

This document describes the SEO (page titles) and UTM parameter tracking implementation in INDEX.

## SEO - Page Titles

All pages now have clean, descriptive titles for SEO and browser tab clarity:

### Server Components (using `metadata` or `generateMetadata`)
- `/` - "INDEX — Personal Business Intelligence for your AI life"
- `/home` - "Home | INDEX"
- `/projects` - "Projects | INDEX"
- `/projects/[id]` - Dynamic: "{Project Name} | INDEX"
- `/conversations/[id]` - Dynamic: "{Conversation Title} | INDEX"
- `/digests` - "Weekly Digests | INDEX"
- `/digests/[id]` - Dynamic: "Weekly Digest ({date range}) | INDEX"
- `/unassigned` - "Unassigned | INDEX"
- `/privacy` - Uses default from layout (can be customized)
- `/terms` - Uses default from layout (can be customized)

### Client Components (using `useEffect` + `document.title`)
- `/ask` - "Ask Index | INDEX"
- `/import` - "Import | INDEX"
- `/auth/signin` - "Sign In | INDEX"
- `/auth/signup` - "Sign Up | INDEX"
- `/auth/forgot-password` - "Forgot Password | INDEX"
- `/auth/reset-password` - "Reset Password | INDEX"
- `/settings` - "Settings | INDEX"
- `/feedback` - "Feedback | INDEX"

## UTM Parameter Tracking & Persistence

### Implementation

UTM parameters are automatically captured and persisted for attribution across the signup flow.

**Storage:**
- UTM params are stored in `localStorage` with key `index_utm_params`
- Expiry: 30 days (auto-cleared after expiry)
- Captured on landing page visit

**Supported UTM Parameters:**
- `utm_source` - Traffic source (e.g., "twitter", "newsletter")
- `utm_medium` - Marketing medium (e.g., "social", "email", "cpc")
- `utm_campaign` - Campaign name (e.g., "alpha-launch", "beta-signup")
- `utm_term` - Paid search keyword (optional)
- `utm_content` - Ad variation/content identifier (optional)

### Flow

1. **Landing Page Visit** (`/`)
   - UTM params extracted from URL
   - Stored in `localStorage` (if any UTM params present)
   - Included in `landing_page_view` analytics event

2. **Signup Flow** (`/auth/signup`)
   - Stored UTM params retrieved from `localStorage`
   - Included in `sign_up_completed` analytics event
   - UTM params cleared after signup (attribution complete)

3. **Analytics Events**
   - All events can access UTM params via `getUTMParamsForAnalytics()`
   - Falls back to current URL params if no stored params
   - Ensures attribution persists across page navigation

### Usage Example

```typescript
import { captureUTMParams, getUTMParamsForAnalytics } from '@/lib/utm';

// On landing page
useEffect(() => {
  captureUTMParams(); // Store UTM params from URL
  
  const utmParams = getUTMParamsForAnalytics();
  trackEvent('landing_page_view', {
    ...utmParams, // Includes utm_source, utm_medium, utm_campaign, etc.
  });
}, []);

// On signup
const utmParams = getStoredUTMParams();
trackEvent('sign_up_completed', {
  ...utmParams, // Attribution for signup
});
clearUTMParams(); // Clean up after attribution
```

### Utility Functions

**`lib/utm.ts`** provides:

- `captureUTMParams()` - Extract and store UTM params from current URL
- `getStoredUTMParams()` - Retrieve stored UTM params (if not expired)
- `clearUTMParams()` - Remove stored UTM params
- `getUTMParamsForAnalytics()` - Get UTM params for events (stored or current URL)

### Analytics Integration

UTM parameters are automatically included in:
- `landing_page_view` - Captured from URL on landing page
- `sign_up_completed` - Retrieved from storage for attribution

All UTM params are optional and only included if present, ensuring clean analytics data.

## Best Practices

1. **Use UTM params in promotional links:**
   ```
   https://indexapp.co/?utm_source=twitter&utm_medium=social&utm_campaign=alpha-launch
   ```

2. **UTM params persist for 30 days** - Users can visit multiple times and still be attributed to the original source

3. **Attribution is cleared after signup** - Prevents double-counting if user signs up again later

4. **Page titles follow pattern:** `{Page/Content Name} | INDEX` for consistency

## Notes

- UTM persistence is client-side only (localStorage)
- No server-side tracking or cookies required
- Works seamlessly with GTM/GA4 dataLayer
- Privacy-friendly: UTM params are marketing metadata, not PII

