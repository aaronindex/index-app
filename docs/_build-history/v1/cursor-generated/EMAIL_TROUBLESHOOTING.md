# Email Troubleshooting Guide

## Subscription Confirmation Email

The subscription confirmation email is sent **immediately** when the Stripe webhook processes `checkout.session.completed`. There is no queuing - it's synchronous.

## How to Debug Missing Emails

### Step 1: Check Vercel Logs

1. Go to **Vercel Dashboard** → Your Project → **Logs**
2. Filter for `/api/stripe/webhook`
3. Look for these log messages after a subscription:
   - `[Webhook] Attempting to send email to {email}`
   - `[Webhook] Successfully sent subscription confirmation email to {email}, email ID: {id}`
   - OR `[Webhook] Resend email error: {error}`

### Step 2: Verify Resend Configuration

Check that these environment variables are set in Vercel:
- `RESEND_API_KEY` - Your Resend API key (starts with `re_`)
- `RESEND_FROM_EMAIL` - Verified sender email (e.g., `INDEX <hello@indexapp.co>`)

**To verify Resend is working:**
1. Go to Resend Dashboard → API Keys
2. Make sure your API key is active
3. Go to Resend Dashboard → Domains
4. Make sure your sending domain is verified

### Step 3: Check Email Status in Resend

1. Go to **Resend Dashboard** → **Emails**
2. Look for emails sent around the time of subscription
3. Check the status:
   - **Delivered** - Email was sent successfully
   - **Bounced** - Email address is invalid
   - **Failed** - There was an error sending
   - **Pending** - Still being processed

### Step 4: Check Spam Folder

Sometimes emails end up in spam. Check the recipient's spam/junk folder.

### Step 5: Verify Webhook is Processing

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check recent events for `checkout.session.completed`
4. Verify the event shows **200 OK** response
5. Click on the event to see the response body

## Common Issues

### Issue: Email not sending, no errors in logs
**Possible causes:**
- `RESEND_API_KEY` not set in Vercel
- `RESEND_FROM_EMAIL` not verified in Resend
- Webhook not processing the event

**Fix:**
1. Verify `RESEND_API_KEY` is set in Vercel environment variables
2. Verify `RESEND_FROM_EMAIL` matches a verified domain in Resend
3. Check Vercel logs for webhook processing

### Issue: Email sending but not received
**Possible causes:**
- Email in spam folder
- Email address typo
- Email provider blocking

**Fix:**
1. Check spam folder
2. Verify email address in Stripe customer record
3. Try sending a test email from Resend dashboard

### Issue: Old emails arriving after fix
**Explanation:**
- Stripe retries failed webhook events
- When you fix the service role key, Stripe retries old events
- This is normal behavior - old events get processed

**Fix:**
- This is expected behavior, not a bug
- New subscriptions should send emails immediately

## Testing Email Sending

You can test if Resend is configured correctly by checking Vercel logs after a subscription. You should see:
```
[Webhook] Attempting to send email to user@example.com
[Webhook] Successfully sent subscription confirmation email to user@example.com, email ID: abc123
```

If you see errors instead, check the error message for details.

