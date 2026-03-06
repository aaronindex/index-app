# Billing Testing Checklist

## Pre-Test Setup

### 1. Stripe Configuration
- [ ] Verify webhook endpoint is configured: `https://indexapp.co/api/stripe/webhook`
- [ ] Verify webhook is listening for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [ ] Verify webhook secret is set in Vercel: `STRIPE_WEBHOOK_SECRET`
- [ ] Verify Stripe keys are set: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_BASE_PRICE_ID`

### 2. Analytics Configuration
- [ ] Verify GTM container ID: `GTM-KP4S9S5Q` (in `app/layout.tsx`)
- [ ] Open browser DevTools → Console
- [ ] Check that `window.dataLayer` exists
- [ ] (Optional) Enable debug logging: Set `NEXT_PUBLIC_DEBUG_ANALYTICS=true` in Vercel env vars

### 3. Email Configuration
- [ ] Verify Resend is configured: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- [ ] Check that subscription confirmation email will be sent

## Test Flow

### Step 1: Create New Test Account
1. Sign out of current account
2. Create new account with test email (e.g., `test+pro@yourdomain.com`)
3. Complete onboarding (or skip it)
4. **Verify**: Account shows as "Free" plan in Settings

### Step 2: Trigger Upgrade
1. Navigate to a place that triggers upgrade:
   - Try to create a 2nd project (should show upgrade modal)
   - OR go to Settings → Subscription → "View Pricing"
   - OR visit `/pricing` page directly
2. Click "Upgrade to Pro" or "Upgrade ($30/mo)"
3. **Verify in Console/Network**:
   - `billing_upgrade_clicked` event fired
   - `billing_checkout_session_created` event fired
   - Redirect to Stripe Checkout

### Step 3: Complete Stripe Checkout
1. In Stripe Checkout:
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Any ZIP
2. Complete payment
3. **Verify**: Redirected to `/billing/success`

### Step 4: Verify Success Page
1. On `/billing/success` page:
   - Should see "Activating your subscription..."
   - **Verify in Console**: `billing_checkout_success_viewed` event fired
2. Wait for activation (should happen within 1-2 seconds)
3. **Verify in Console**: `billing_pro_activated` event fired with `latency_ms`
4. **Verify**: Redirected to `/home`

### Step 5: Verify Subscription Status
1. Go to Settings → Subscription
2. **Verify**: Shows "Current Plan: Pro" with status "Active"
3. **Verify in Supabase**: 
   - `profiles.plan = 'pro'`
   - `profiles.plan_status = 'active'`
   - `profiles.stripe_subscription_id` is set
   - `profiles.stripe_customer_id` is set

### Step 6: Verify Email
1. Check email inbox (the email used in Stripe checkout)
2. **Verify**: Received "Welcome to INDEX Pro" email from INDEX
3. **Verify**: Email has correct styling and content

### Step 7: Verify Billing Events
1. In Supabase, query `billing_events` table:
   ```sql
   SELECT * FROM billing_events 
   WHERE user_id = 'your-user-id' 
   ORDER BY created_at DESC;
   ```
2. **Verify**: At least one row with:
   - `event_type = 'subscription_activated'`
   - `plan = 'pro'`
   - `stripe_event_id` is set

### Step 8: Verify Webhook Processing
1. In Stripe Dashboard → Developers → Webhooks → Your endpoint
2. Check recent events for `checkout.session.completed`
3. **Verify**: Event shows "200 OK" response
4. Click on event to see response body: `{"received": true}`
5. **Verify**: No errors in Vercel logs

### Step 9: Verify GA4 Events
1. Open GA4 DebugView (or wait for real-time events)
2. **Verify** these events appear:
   - `billing_upgrade_clicked`
   - `billing_checkout_session_created`
   - `billing_checkout_success_viewed`
   - `billing_pro_activated`
3. **Verify** each event has:
   - `event_id` (UUID)
   - `plan: 'pro'`
   - `price_usd: 30`
   - `source` (for upgrade_clicked and checkout_session_created)
   - `latency_ms` (for pro_activated)
   - UTM params (if available)

### Step 10: Test Subscription Management
1. In Settings → Subscription
2. **Verify**: "Cancel Subscription" button is visible
3. Click "Cancel Subscription"
4. Confirm cancellation
5. **Verify**: Shows success message
6. **Verify in Supabase**: `profiles.plan_status = 'canceled'` (plan still 'pro' until period ends)
7. **Verify in Stripe**: Subscription shows `cancel_at_period_end: true`

### Step 11: Test Cancel Flow (Optional)
1. Start upgrade flow again
2. In Stripe Checkout, click "Cancel" or close the window
3. **Verify**: Redirected to `/billing/cancel`
4. **Verify in Console**: `billing_checkout_canceled_viewed` event fired

## Debugging Tips

### If webhook doesn't process:
1. Check Vercel logs for webhook errors
2. Check Stripe webhook logs for response codes
3. Verify webhook secret matches between Stripe and Vercel
4. Check that `user_id` is in checkout session metadata

### If events don't appear in GA4:
1. Check browser console for `window.dataLayer` errors
2. Verify GTM container is loaded (check Network tab)
3. Check GTM Preview mode to see if events are received
4. Verify `NEXT_PUBLIC_DEBUG_ANALYTICS=true` to see console logs

### If email doesn't send:
1. Check Vercel logs for Resend errors
2. Verify `RESEND_API_KEY` is set correctly
3. Check Resend dashboard for delivery status
4. Note: Email failures don't fail the webhook (logged only)

## Expected Event Sequence

1. User clicks upgrade → `billing_upgrade_clicked`
2. Checkout session created → `billing_checkout_session_created`
3. User completes payment → Stripe processes
4. Webhook receives `checkout.session.completed` → Updates profile + sends email
5. User lands on success page → `billing_checkout_success_viewed`
6. Polling detects pro plan → `billing_pro_activated`
7. User redirected to home

## Cleanup After Testing

1. Cancel test subscription in Stripe (or let it expire)
2. Optionally delete test account in Supabase
3. Clear test data from `billing_events` if needed

