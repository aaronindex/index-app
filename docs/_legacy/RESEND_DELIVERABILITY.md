# Resend Email Deliverability Guide

## Quick Wins (Do These First)

### 1. Verify Your Domain in Resend

**Critical for deliverability:**
1. Go to **Resend Dashboard** → **Domains**
2. Add your domain: `indexapp.co` (or your actual domain)
3. Add the DNS records Resend provides:
   - **SPF record** - Authorizes Resend to send on your behalf
   - **DKIM record** - Signs emails cryptographically
   - **DMARC record** - Policy for handling failed authentication

**Why this matters:**
- Without domain verification, emails are more likely to go to spam
- Domain authentication (SPF/DKIM/DMARC) is the #1 factor for deliverability
- Gmail, Outlook, and other providers heavily weight domain authentication

### 2. Use a Verified Domain in From Address

**Current setup:**
- `RESEND_FROM_EMAIL` should use your verified domain
- Example: `INDEX <hello@indexapp.co>` ✅
- NOT: `INDEX <hello@gmail.com>` ❌

**Best practices:**
- Use a subdomain for transactional emails: `noreply@indexapp.co` or `hello@indexapp.co`
- Keep the "From" name consistent: `INDEX` (not `Index` or `index`)
- Use a real email address that can receive replies (even if you auto-forward)

### 3. Add Unsubscribe/List-Unsubscribe Headers

Resend automatically adds these, but verify they're present:
- `List-Unsubscribe` header (allows one-click unsubscribe in Gmail)
- `List-Unsubscribe-Post` header (RFC 8058)

**Note:** Resend handles this automatically for transactional emails, but it's good to verify.

## Email Content Best Practices

### 1. Avoid Spam Trigger Words

Your current emails are good, but avoid:
- "Free", "Act now", "Limited time", "Click here", excessive exclamation marks
- All caps, excessive punctuation
- Suspicious links or shortened URLs

### 2. Text-to-Image Ratio

- Your emails are mostly text ✅ (good)
- Avoid image-heavy emails (spam filters flag these)
- Always include alt text for images

### 3. Link Best Practices

- Use full URLs (not shortened): `https://indexapp.co/settings` ✅
- Avoid suspicious link patterns
- Make sure links point to your verified domain

### 4. Email Structure

Your current structure is good:
- Clear subject lines
- Plain text alternative (Resend can generate this)
- Proper HTML structure
- Mobile-responsive design

## Sender Reputation

### 1. Start Small, Scale Gradually

- If you're new to sending, start with low volume
- Gradually increase volume as reputation builds
- Sudden spikes in volume can trigger spam filters

### 2. Monitor Bounce Rates

- Keep bounce rate < 5%
- Remove invalid email addresses immediately
- Use Resend's bounce handling (automatic)

### 3. Monitor Complaint Rates

- Keep complaint rate < 0.1%
- Make unsubscribe easy (for marketing emails)
- For transactional emails (like subscription confirmations), complaints should be near zero

### 4. Warm Up Your Domain (If New)

If `indexapp.co` is a new domain:
- Start with low volume (10-20 emails/day)
- Gradually increase over 2-4 weeks
- Resend can help with this process

## Technical Improvements

### 1. Add Reply-To Header

For better deliverability and user experience:
```typescript
await resend.emails.send({
  from: 'INDEX <hello@indexapp.co>',
  to: customerEmail,
  replyTo: 'support@indexapp.co', // Add this
  subject: 'Welcome to INDEX Pro',
  html: renderSubscriptionConfirmationEmail(),
});
```

### 2. Use Consistent From Address

- Use the same from address for all transactional emails
- Don't switch between `hello@`, `noreply@`, `support@` randomly
- Pick one and stick with it

### 3. Add Preheader Text

Some email clients show a preview snippet. Add this to your templates:
```html
<!-- Preheader text (hidden, shown in email preview) -->
<div style="display: none; font-size: 1px; color: #faf8f6; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
  Your subscription is now active. You have unlimited access to INDEX.
</div>
```

### 4. Test Email Rendering

- Use tools like Litmus or Email on Acid
- Test in Gmail, Outlook, Apple Mail, etc.
- Ensure emails render correctly on mobile

## Monitoring & Maintenance

### 1. Check Resend Dashboard Regularly

- **Resend Dashboard** → **Emails** → Check delivery rates
- Look for patterns: Are certain providers blocking?
- Monitor bounce and complaint rates

### 2. Set Up Webhooks (Optional)

Resend can send webhooks for:
- Email delivered
- Email bounced
- Email complained (spam report)

Useful for monitoring and automatic cleanup.

### 3. Use Resend's Suppression List

- Resend automatically maintains a suppression list
- Bounced/complained emails are automatically suppressed
- Check: **Resend Dashboard** → **Suppressions**

## Domain Setup Checklist

- [ ] Domain added to Resend (`indexapp.co`)
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS (start with `p=none`, then `p=quarantine`, then `p=reject`)
- [ ] Domain verified in Resend dashboard
- [ ] `RESEND_FROM_EMAIL` uses verified domain
- [ ] Test email sent and received in inbox (not spam)

## Quick Test

1. Send a test email to yourself
2. Check if it arrives in inbox or spam
3. If spam, check:
   - Domain authentication (SPF/DKIM/DMARC)
   - From address matches verified domain
   - Email content (no spam triggers)

## Resources

- [Resend Domain Setup Guide](https://resend.com/docs/dashboard/domains/introduction)
- [Resend Best Practices](https://resend.com/docs/send-with-nodejs)
- [DMARC Record Generator](https://www.dmarcanalyzer.com/dmarc-record-generator/)

## Priority Actions

**Do these in order:**
1. ✅ Verify domain in Resend (add DNS records)
2. ✅ Ensure `RESEND_FROM_EMAIL` uses verified domain
3. ✅ Test email delivery
4. ✅ Monitor bounce/complaint rates
5. ✅ Gradually increase volume if new domain

