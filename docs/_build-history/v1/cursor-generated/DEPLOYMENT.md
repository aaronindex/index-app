# INDEX Deployment Guide

## Pre-Deployment Checklist

### 1. Code Status
- [x] All features implemented and tested locally
- [x] PWA manifest and icons in place
- [x] Mobile hamburger navigation working
- [ ] Build passes locally (may fail due to Node version - Vercel will use Node 20)

### 2. Git Status
```bash
git status  # Review all changes
git add .   # Stage all changes
git commit -m "Deploy: PWA support, mobile nav, reducing valve features"
git push    # Push to main/master
```

### 3. Vercel Environment Variables

**Required Variables** (set in Vercel Dashboard > Settings > Environment Variables):

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

#### OpenAI
- `OPENAI_API_KEY` - OpenAI API key for embeddings and LLM

#### Resend (Email)
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM_EMAIL` - `INDEX <hello@indexapp.co>` (or your verified domain)

#### App Configuration
- `NEXT_PUBLIC_APP_URL` - `https://indexapp.co` (production URL)
- `CRON_TOKEN` - Secure random token for cron job authentication
  - Generate: `openssl rand -hex 32`
  - Used by `/api/jobs/process` endpoint

#### Optional
- `NEXT_PUBLIC_ENABLE_EXPERIMENTS` - Set to `false` (or `true` to enable experimental features)
- `FEEDBACK_EMAIL` - Email to receive feedback (defaults to `aaron@indexapp.co`)

### 4. Vercel Configuration

**Node Version**: Specified in `.nvmrc` (Node 20)

**Cron Jobs**: Configured in `vercel.json`
- Job processing runs every minute: `/api/jobs/process`

**Domain**: Should be connected to `indexapp.co` in Vercel dashboard

### 5. Post-Deployment Verification

1. **App Accessibility**
   - [ ] Visit https://indexapp.co
   - [ ] Verify homepage loads
   - [ ] Check mobile responsiveness

2. **Authentication**
   - [ ] Sign up flow works
   - [ ] Sign in flow works
   - [ ] Auth callback works

3. **Core Features**
   - [ ] Projects list loads
   - [ ] Can create projects
   - [ ] Import functionality works
   - [ ] Ask Index works
   - [ ] Resume modal works

4. **PWA Installability**
   - [ ] Open Chrome DevTools > Application > Manifest
   - [ ] Verify manifest loads correctly
   - [ ] Check all icons are accessible
   - [ ] Test "Install" prompt (if criteria met)

5. **GTM/GA Setup**
   - [ ] Verify GTM container ID in `app/layout.tsx` (GTM-KP4S9S5Q)
   - [ ] Check GTM dashboard for events
   - [ ] Verify page views tracking
   - [ ] Test custom events if configured

6. **Email Functionality**
   - [ ] Weekly digest generation works
   - [ ] Feedback emails send correctly
   - [ ] Email links use correct domain

7. **Background Jobs**
   - [ ] Check Vercel cron logs
   - [ ] Verify job processing endpoint is secured with CRON_TOKEN
   - [ ] Test import job processing

### 6. Common Build Errors & Fixes

**Error: "Cannot find module 'dotenv'"**
- This was a previous issue - should be resolved
- If it persists, ensure `dotenv` is in dependencies (it is)

**Error: "useSearchParams() should be wrapped in suspense"**
- Should be fixed in auth pages
- If it persists, check `/app/auth/signin/page.tsx`

**Error: Node version mismatch**
- Vercel should use Node 20 (specified in `.nvmrc`)
- If issues persist, set in Vercel dashboard: Settings > General > Node.js Version

**Error: TypeScript errors**
- Run `npm run lint` locally
- Fix any TypeScript errors before pushing

### 7. Domain Configuration

Ensure in Vercel:
1. Domain `indexapp.co` is added to project
2. DNS records are configured correctly
3. SSL certificate is active (automatic with Vercel)

### 8. Monitoring

After deployment:
- Monitor Vercel logs for errors
- Check Supabase logs for database issues
- Monitor OpenAI API usage
- Review Resend email delivery

## Quick Deploy Command

```bash
# 1. Review changes
git status

# 2. Stage and commit
git add .
git commit -m "Deploy: Production ready"

# 3. Push to trigger Vercel deployment
git push origin main  # or master, depending on your branch

# 4. Monitor deployment in Vercel dashboard
# 5. Set environment variables if not already set
# 6. Test live site
```

## Environment Variables Quick Reference

Copy this list when setting up in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL
CRON_TOKEN
```

All should be set for **Production**, **Preview**, and **Development** environments.

