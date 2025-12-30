# Vercel Environment Variables Fix

## Issue
Environment variables (`OPENAI_API_KEY`, `RESEND_API_KEY`) were being accessed at module load time during build, causing build failures.

## Fix Applied
Changed initialization from **eager** (at module load) to **lazy** (when actually needed):

### Before (❌ Fails during build):
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
```

### After (✅ Works):
```typescript
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

// Use when needed:
const resend = getResend();
```

## Files Fixed
- ✅ `app/api/feedback/route.ts`
- ✅ `lib/email/digest.ts`

## Next Steps

1. **Commit and push the fix:**
   ```bash
   git add app/api/feedback/route.ts lib/email/digest.ts
   git commit -m "fix: lazy initialize Resend to avoid build-time env var errors"
   git push origin main
   ```

2. **Verify environment variables in Vercel:**
   - Go to Vercel Dashboard > Settings > Environment Variables
   - Ensure these are set for **Production**, **Preview**, and **Development**:
     - `OPENAI_API_KEY`
     - `RESEND_API_KEY`
     - `RESEND_FROM_EMAIL`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_APP_URL`
     - `CRON_TOKEN`

3. **Redeploy:**
   - Vercel should auto-deploy after push
   - Or manually trigger: Deployments > Deploy

## Why This Works

Next.js builds run in a Node.js environment where:
- Environment variables are available at **runtime** (when API routes execute)
- But may not be available during **build time** (when modules are loaded)

By using lazy initialization, we ensure:
- Variables are only accessed when functions are actually called
- This happens at runtime, not build time
- Build succeeds even if variables aren't set (they'll error at runtime if missing, which is expected)

