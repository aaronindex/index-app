# Pricing Page & ALPHA_MODE Feature Flag Implementation

## Summary

This implementation adds:
1. A public `/pricing` page with Free vs Pro comparison
2. An `ALPHA_MODE` feature flag that controls invite-code gating globally

## Files Added

1. **app/pricing/page.tsx** - Public pricing page with Free/Pro comparison
2. **lib/config/flags.ts** - Feature flags configuration (ALPHA_MODE)

## Files Modified

1. **app/components/Footer.tsx** - Added "Pricing" link
2. **app/components/LandingPage.tsx** - Conditional CTA/copy based on ALPHA_MODE
3. **app/auth/signup/page.tsx** - Conditional invite code validation based on ALPHA_MODE
4. **app/api/invite-codes/verify/route.ts** - Bypass validation when ALPHA_MODE is false
5. **app/api/invite-codes/use/route.ts** - Bypass usage tracking when ALPHA_MODE is false
6. **app/components/billing/UpgradeModal.tsx** - Added 'pricing_page' as valid source

## Environment Variables

### Required
- **ALPHA_MODE** - `"true"` or `"false"` (string)
  - When `"true"`: Invite code gating is enabled (current behavior)
  - When `"false"`: Invite code gating is bypassed, open signup

### Optional (for pricing page limits display)
- `NEXT_PUBLIC_FREE_MAX_ACTIVE_PROJECTS` - Default: `1`
- `NEXT_PUBLIC_FREE_MAX_ASK_PER_24H` - Default: `15`
- `NEXT_PUBLIC_FREE_MAX_DIGEST_PER_30D` - Default: `4`
- `NEXT_PUBLIC_FREE_ASSET_UPLOADS_ENABLED` - Default: `false`

Note: Currently, pricing page uses hardcoded defaults. TODO: Fetch from server or use NEXT_PUBLIC_ env vars.

## ALPHA_MODE Behavior

### When ALPHA_MODE = "true" (Alpha Mode ON)
- **Signup**: Requires invite code validation
- **Landing Page**: Shows "Request an invite" / "Join alpha" messaging
- **Invite Code Input**: Visible and required
- **API Endpoints**: Enforce invite code validation

### When ALPHA_MODE = "false" (Alpha Mode OFF)
- **Signup**: No invite code required, open signup
- **Landing Page**: Shows "Get started" / "Create account" CTAs
- **Invite Code Input**: Hidden from UI
- **API Endpoints**: Bypass invite code validation (return success)

## Pricing Page Features

### Content
- H1: "INDEX Pro — $30/month"
- Subhead: "Try INDEX free. Upgrade when you hit the free limits."
- Two-column comparison: Free vs Pro

### Free Tier Limits (Displayed)
- 1 active project
- Quick import only (paste a chat)
- Links in Project Library (no uploads)
- Ask Index capped (15 queries per 24h)
- 4 Weekly Digests in first 30 days (use it or lose it)

### Pro Tier Features
- Unlimited projects
- Full JSON import
- Uploads in Project Library
- Higher/removed caps

### CTAs
- **"Get started (free)"**: Routes to `/auth/signup`
- **"Upgrade to Pro"**:
  - If signed in: Opens upgrade modal
  - If signed out: Routes to `/auth/signin?redirect=/pricing`

### Analytics
- Fires `pricing_viewed` event on page load
- Includes `event_id` (UUID) and optional UTM params from stored attribution

## Assumptions

1. **Signin redirect handling**: The existing `/auth/signin` page already handles `redirect` query parameter, so users will be redirected back to `/pricing` after signing in.

2. **Upgrade flow**: Signed-in users on pricing page can upgrade via the existing `UpgradeModal` component (same flow as paywall modals).

3. **Client-side ALPHA_MODE**: The flag is read client-side in components. For server-side checks, the same `lib/config/flags.ts` is used.

4. **Pricing limits**: Currently hardcoded to match `lib/limits.ts` defaults. Future improvement: Fetch from server or use NEXT_PUBLIC_ env vars.

5. **Footer placement**: Pricing link added to main footer (used across signed-in and signed-out pages).

## Testing Checklist

- [ ] Pricing page loads for signed-out users
- [ ] Pricing page loads for signed-in users
- [ ] "Get started" button routes to signup
- [ ] "Upgrade to Pro" shows modal for signed-in users
- [ ] "Upgrade to Pro" routes to signin with redirect for signed-out users
- [ ] Footer "Pricing" link works
- [ ] `pricing_viewed` event fires with correct params
- [ ] ALPHA_MODE="true": Invite code required on signup
- [ ] ALPHA_MODE="true": Landing page shows invite code input
- [ ] ALPHA_MODE="false": Signup works without invite code
- [ ] ALPHA_MODE="false": Landing page shows "Get started" CTA
- [ ] ALPHA_MODE="false": Invite code input hidden on signup page

