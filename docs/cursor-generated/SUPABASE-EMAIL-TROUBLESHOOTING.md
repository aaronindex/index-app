# Supabase Email Troubleshooting

## Issue: Not Receiving Magic Link / Confirmation Emails

If users are not receiving signup confirmation emails, check the following:

### 1. Supabase Email Settings

Go to: **Supabase Dashboard > Authentication > URL Configuration**

#### Required Settings:

1. **Site URL**: Must be set to your production domain
   - Example: `https://indexapp.co`
   - This is the base URL for your app

2. **Redirect URLs**: Must include your callback URL
   - Add: `https://indexapp.co/auth/callback`
   - Add: `https://indexapp.co/**` (wildcard for all paths)
   - This allows Supabase to redirect users after email confirmation

### 2. Email Confirmation Settings

Go to: **Supabase Dashboard > Authentication > Email Templates**

1. **Confirm signup** template should be enabled
2. Check that email confirmation is **required** (not disabled)

Go to: **Supabase Dashboard > Authentication > Settings**

1. **Enable email confirmations**: Should be **ON**
2. **Secure email change**: Can be ON or OFF (your preference)

### 3. Email Provider Configuration

Supabase uses its default email service by default, but you can configure custom SMTP:

Go to: **Supabase Dashboard > Settings > Auth > SMTP Settings**

- If using default: No configuration needed
- If using custom SMTP: Ensure credentials are correct

### 4. Check Email Spam Folder

- Magic links often go to spam
- Check spam/junk folder
- Add `noreply@mail.app.supabase.io` to contacts if using default email

### 5. Verify Environment Variables

Ensure these are set correctly in Vercel:

- `NEXT_PUBLIC_APP_URL`: `https://indexapp.co` (must match Site URL in Supabase)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

### 6. Test Email Delivery

1. Try signing up with a different email address
2. Check Supabase logs: **Supabase Dashboard > Logs > Auth Logs**
3. Look for email send errors or rate limiting

### 7. Common Issues

#### Issue: "Email already registered"
- User might already have an account
- Try password reset instead

#### Issue: "Invalid redirect URL"
- The redirect URL in `emailRedirectTo` must be whitelisted
- Check Supabase Dashboard > Authentication > URL Configuration

#### Issue: Emails not sending
- Check Supabase rate limits (free tier has limits)
- Verify SMTP settings if using custom provider
- Check Supabase status page for service issues

### 8. Debugging in Code

The signup page now includes console logging. Check browser console for:
- `[Signup] Attempting signup with:` - Shows the email and redirect URL
- `[Signup] Signup response:` - Shows if user was created and if email was sent
- `[Signup] Email confirmation required` - Confirms email should be sent

### 9. Manual Verification

To manually verify email confirmation is working:

1. Sign up with a test email
2. Check Supabase Dashboard > Authentication > Users
3. Look for the new user - they should have `email_confirmed_at: null` until they click the link
4. The email should contain a link like: `https://indexapp.co/auth/callback?token=...&type=signup`

### 10. Alternative: Disable Email Confirmation (Development Only)

⚠️ **Only for development/testing** - Not recommended for production

Go to: **Supabase Dashboard > Authentication > Settings**

- Turn OFF "Enable email confirmations"
- Users will be automatically confirmed on signup
- **Remember to turn this back ON for production!**

