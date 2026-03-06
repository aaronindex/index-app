# Supabase Service Role Key Troubleshooting

## The Problem
If you're getting "Invalid API key" errors, you likely have the wrong key or it's not set correctly.

## How to Fix

### Step 1: Get the Correct Key from Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Click **Settings** (gear icon in sidebar)
3. Click **API** in the settings menu
4. Scroll down to find **Project API keys**

You'll see two keys:
- **`anon` `public`** - This is the PUBLIC key (starts with `eyJ...`)
- **`service_role` `secret`** - This is the SERVICE ROLE key (also starts with `eyJ...`)

**You need the `service_role` key**, NOT the `anon` key.

### Step 2: Verify the Key Format

The service_role key should:
- Start with `eyJ` (JWT token format)
- Be about 130-150 characters long
- Be labeled as `service_role` and `secret` in Supabase dashboard
- **NOT** be the same as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Update Environment Variables

#### Local (.env.local):
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (full key)
```

#### Vercel:
1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. Find `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Edit**
5. Paste the **full service_role key** from Supabase
6. Make sure it's set for **Production**, **Preview**, and **Development** (or just Production if you prefer)
7. **Save**

### Step 4: Redeploy

After updating in Vercel:
- The next deployment will pick up the new key
- Or trigger a redeploy manually: **Deployments** → **Redeploy**

### Step 5: Test

Visit `/api/admin/test-service-key` (while logged in) and verify:
- `clientTest: "success"`
- `listUsersTest: "success (found X users)"`

## Common Mistakes

1. **Using anon key instead of service_role key**
   - The anon key is public and doesn't have admin permissions
   - Service role key is secret and bypasses RLS

2. **Key truncated or has extra spaces**
   - Copy the entire key, no spaces before/after
   - Check for line breaks if copying from a file

3. **Wrong environment variable name**
   - Must be exactly: `SUPABASE_SERVICE_ROLE_KEY`
   - Not `SUPABASE_SERVICE_KEY` or `SERVICE_ROLE_KEY`

4. **Key not updated in Vercel**
   - Local `.env.local` only affects local development
   - Production uses Vercel environment variables

## Why This Matters

The service role key is required for:
- Stripe webhook processing (updating profiles, inserting billing events)
- Admin operations (listing users, deleting accounts)
- Background jobs (lifecycle emails, cron tasks)

Without a valid service role key, these operations will fail silently or return errors.

