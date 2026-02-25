# How to Verify Subscription Cancellation in Stripe

## In Stripe Dashboard

### 1. Find the Subscription
1. Go to **Stripe Dashboard** → **Customers**
2. Search for the customer email or customer ID
3. Click on the customer
4. Scroll to **Subscriptions** section

### 2. Check Subscription Status
Look for these indicators:

**Active Subscription (Canceled at Period End):**
- Status: `active` (but will show `cancel_at_period_end: true`)
- **Cancel at period end**: `Yes` or `true`
- **Current period end**: Shows the date when subscription will actually end
- **Cancel at**: Shows the timestamp when cancellation was set

**What to look for:**
- The subscription should still show as `active` (you keep access until period ends)
- But `cancel_at_period_end` should be `true`
- `cancel_at` should show a timestamp (when it was canceled)

### 3. Verify No Future Charges
- The subscription will **not** renew after the current period ends
- You can see the "Current period end" date - that's when it will stop
- No new invoices will be generated after that date

### 4. Check Subscription Details
Click on the subscription to see:
- **Status**: `active` (but canceled at period end)
- **Cancel at period end**: `Yes`
- **Canceled at**: Timestamp of when cancellation was set
- **Current period end**: Date when subscription will actually end

## In Our Database

### Check `profiles` table:
```sql
SELECT 
  id,
  email,  -- from auth.users
  plan,
  plan_status,
  stripe_subscription_id,
  plan_updated_at
FROM profiles
WHERE id = 'your-user-id';
```

**Expected after cancellation:**
- `plan`: `'pro'` (still pro until period ends)
- `plan_status`: `'canceled'`
- `plan_updated_at`: Should be updated to cancellation time

### Check `billing_events` table:
```sql
SELECT *
FROM billing_events
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

**Should see:**
- Event with `event_type = 'subscription_canceled'`
- `plan = 'pro'`
- `created_at` = time of cancellation

## What Happens Next

1. **Immediately**: Subscription shows `cancel_at_period_end: true` in Stripe
2. **Until period ends**: User keeps Pro access
3. **After period ends**: 
   - Stripe webhook fires `customer.subscription.deleted` event
   - Our webhook sets `plan = 'free'` and `plan_status = 'canceled'`
   - User loses Pro access

## Testing Cancellation

To test the full cancellation flow:
1. Cancel subscription (done ✅)
2. Wait for current period to end (or manually end it in Stripe for testing)
3. Verify webhook processes `customer.subscription.deleted`
4. Verify profile is set to `plan = 'free'`

