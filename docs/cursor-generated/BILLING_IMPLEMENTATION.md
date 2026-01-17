# Stripe Billing Implementation Summary

## SQL Migrations

### 1. Add Billing Fields to Profiles

```sql
-- Add billing fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS plan_status TEXT CHECK (plan_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add attribution fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS initial_referrer TEXT,
ADD COLUMN IF NOT EXISTS initial_landing_path TEXT,
ADD COLUMN IF NOT EXISTS initial_utm_captured_at TIMESTAMPTZ;
```

### 2. Create Billing Events Table

```sql
-- Create billing_events table
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('subscription_activated', 'subscription_updated', 'subscription_canceled')),
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro')),
  price_id TEXT,
  stripe_event_id TEXT UNIQUE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing_events(stripe_event_id);

-- RLS for billing_events
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Users can select their own billing events
CREATE POLICY "Users can view their own billing events"
  ON billing_events
  FOR SELECT
  USING (auth.uid() = user_id);
```

## DataLayer Events

### Event: `billing_upgrade_clicked`
- **When**: User clicks "Upgrade" button in paywall modal
- **Params**:
  - `source`: string - One of: `'paywall_project_limit'`, `'paywall_ask_limit'`, `'paywall_asset_upload'`, `'settings'`, `'header'`
  - `plan`: string - `'pro'`
  - `price_usd`: number - `30`
  - `event_id`: string - UUID for deduplication
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`: string (optional) - From stored attribution

### Event: `billing_checkout_session_created`
- **When**: Checkout session successfully created, before redirect to Stripe
- **Params**:
  - `source`: string - Same as `billing_upgrade_clicked`
  - `plan`: string - `'pro'`
  - `price_usd`: number - `30`
  - `event_id`: string - UUID
  - `utm_*`: string (optional) - Attribution params

### Event: `billing_checkout_success_viewed`
- **When**: User lands on `/billing/success` page
- **Params**:
  - `plan`: string - `'pro'`
  - `price_usd`: number - `30`
  - `event_id`: string - UUID
  - `utm_*`: string (optional) - Attribution params

### Event: `billing_pro_activated`
- **When**: User's plan becomes 'pro' after checkout (polled on success page)
- **Params**:
  - `plan`: string - `'pro'`
  - `price_usd`: number - `30`
  - `latency_ms`: number - Time from checkout completion to activation
  - `event_id`: string - UUID
  - `utm_*`: string (optional) - Attribution params

### Event: `billing_checkout_canceled_viewed`
- **When**: User lands on `/billing/cancel` page
- **Params**:
  - `plan`: string - `'pro'`
  - `price_usd`: number - `30`
  - `event_id`: string - UUID
  - `utm_*`: string (optional) - Attribution params

## Files Changed/Added

### New Files

1. **lib/stripe/config.ts** - Stripe configuration helper with environment-aware key selection
2. **lib/stripe/service.ts** - Stripe client initialization
3. **lib/analytics/attribution.ts** - Attribution persistence (first-touch)
4. **lib/analytics/track.ts** - Enhanced analytics tracking with event_id and UTM
5. **lib/billing/plan.ts** - Plan checking utilities
6. **app/api/billing/create-checkout-session/route.ts** - Create Stripe Checkout Session
7. **app/api/billing/check-project-limit/route.ts** - Check project creation limit
8. **app/api/stripe/webhook/route.ts** - Stripe webhook handler
9. **app/api/attribution/attach/route.ts** - Attach attribution to profile
10. **app/billing/success/page.tsx** - Checkout success page
11. **app/billing/cancel/page.tsx** - Checkout cancel page
12. **app/components/billing/UpgradeModal.tsx** - Upgrade paywall modal
13. **app/components/AttributionCapture.tsx** - Client component for attribution capture
14. **supabase/migrations/add_billing_fields.sql** - Database schema changes

### Modified Files

1. **lib/limits.ts** - Added plan checks, env-driven limits, new `checkProjectLimit` function
2. **app/projects/components/CreateProjectButton.tsx** - Added paywall check and upgrade modal
3. **app/api/search/route.ts** - Enhanced error response with paywall source
4. **app/api/assets/create/route.ts** - Enhanced error response with paywall source, added userId to checkAssetLimit
5. **app/components/LandingPage.tsx** - Added attribution capture
6. **app/layout.tsx** - Added AttributionCapture component
7. **app/auth/signup/page.tsx** - Added attribution attachment on signup
8. **package.json** - Added `stripe` dependency

## Environment Variables

### Required (Local)
- `STRIPE_ENABLED` - `"true"` or `"false"`
- `STRIPE_TEST_SECRET_KEY` - Test secret key (sk_test_*)
- `STRIPE_TEST_PUBLISHABLE_KEY` - Test publishable key (pk_test_*)
- `STRIPE_TEST_BASE_PRICE_ID` - Test price ID
- `STRIPE_TEST_WEBHOOK_SECRET` - Webhook secret from `stripe listen`

### Required (Production)
- `STRIPE_ENABLED` - `"true"` or `"false"`
- `STRIPE_SECRET_KEY` - Live secret key (sk_live_*)
- `STRIPE_PUBLISHABLE_KEY` - Live publishable key (pk_live_*)
- `STRIPE_BASE_PRICE_ID` - Live price ID
- `STRIPE_WEBHOOK_SECRET` - Webhook secret from Stripe dashboard

### Optional (Limits Configuration)
- `FREE_MAX_ACTIVE_PROJECTS` - Default: `1`
- `FREE_MAX_ASK_PER_24H` - Default: `15`
- `FREE_MAX_DIGEST_PER_30D` - Default: `4`
- `FREE_ASSET_UPLOADS_ENABLED` - Default: `false`
- `FREE_IMPORT_MODE` - Default: `'quick_only'` (options: `'quick_only'` | `'full'`)

### Existing
- `APP_URL` - Used for checkout success/cancel URLs
- `SUPABASE_SERVICE_ROLE_KEY` - Required for webhook operations

## Usage Gating

### Project Creation
- Free: 1 active project (configurable via `FREE_MAX_ACTIVE_PROJECTS`)
- Pro: Unlimited

### Ask Queries
- Free: Limited per 24h (configurable via `FREE_MAX_ASK_PER_24H`)
- Pro: Unlimited

### Asset Uploads
- Free: Disabled (links only) or limited (configurable via `FREE_ASSET_UPLOADS_ENABLED`)
- Pro: Enabled

### Import Mode
- Free: Quick import only (configurable via `FREE_IMPORT_MODE`)
- Pro: Full imports (JSON)

## Webhook Setup

1. **Local Testing**: Use `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. **Production**: Configure webhook endpoint in Stripe Dashboard:
   - URL: `https://indexapp.co/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Notes

- All analytics events exclude PII (no email, names, Stripe IDs)
- Attribution is first-touch only (stored in localStorage, attached to profile on signup/login)
- Webhook is source of truth for plan state
- Idempotency handled via `stripe_event_id` in `billing_events` table
- Pro users bypass all limits automatically

