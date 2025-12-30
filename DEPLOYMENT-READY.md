# 🚀 INDEX Deployment Ready

## Status: Ready to Deploy

All code changes are complete. The local build fails due to Node v12, but **Vercel will use Node 20** (specified in `.nvmrc`).

## Quick Start

### 1. Push to Git
```bash
git add .
git commit -m "Deploy: PWA support, mobile nav, reducing valve features, job system"
git push origin main  # or master
```

This will automatically trigger a Vercel deployment.

### 2. Set Environment Variables in Vercel

Go to: **Vercel Dashboard > Your Project > Settings > Environment Variables**

Add these variables for **Production**, **Preview**, and **Development**:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `RESEND_API_KEY` | Resend API key | `re_...` |
| `RESEND_FROM_EMAIL` | Email sender | `INDEX <hello@indexapp.co>` |
| `NEXT_PUBLIC_APP_URL` | Production URL | `https://indexapp.co` |
| `CRON_TOKEN` | Secure token for cron jobs | Generate: `openssl rand -hex 32` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ENABLE_EXPERIMENTS` | Enable experimental features | `false` |
| `FEEDBACK_EMAIL` | Feedback recipient | `aaron@indexapp.co` |

### 3. Verify Deployment

1. **Check Vercel Dashboard**
   - Deployment should start automatically after git push
   - Monitor build logs for any errors
   - Should complete in ~2-3 minutes

2. **Test Live Site**
   - Visit https://indexapp.co
   - Test sign up/sign in
   - Verify core features work

3. **Check GTM/GA**
   - GTM container ID: `GTM-KP4S9S5Q` (already in `app/layout.tsx`)
   - Verify events are firing in GTM dashboard
   - Check Google Analytics for page views

## What's New in This Deployment

✅ **PWA Installability**
- Web app manifest configured
- All required icons in place
- Theme colors set for light/dark modes

✅ **Mobile Navigation**
- Hamburger menu for mobile screens
- Responsive header collapse

✅ **Reducing Valve Features**
- Personal/Business project filtering
- Active/Inactive item suppression
- Redaction tooling

✅ **Background Job System**
- Durable import processing
- Step-by-step job execution
- Progress tracking and retry logic

✅ **Library Tab**
- Asset management (links, files, YouTube)
- Thumbnail previews
- View modal for images/videos

## Post-Deployment Checklist

- [ ] App loads at https://indexapp.co
- [ ] Authentication works (sign up/in)
- [ ] Projects list and creation work
- [ ] Import functionality works
- [ ] Ask Index works
- [ ] Mobile navigation works
- [ ] PWA manifest loads (Chrome DevTools > Application > Manifest)
- [ ] GTM/GA tracking works
- [ ] Email features work (digest, feedback)
- [ ] Background jobs process correctly

## Troubleshooting

**Build fails on Vercel?**
- Check Node version is 20 (should auto-detect from `.nvmrc`)
- Review build logs in Vercel dashboard
- Ensure all environment variables are set

**App doesn't load?**
- Check domain configuration in Vercel
- Verify DNS records are correct
- Check SSL certificate status

**GTM not tracking?**
- Verify GTM container ID in `app/layout.tsx`
- Check browser console for GTM errors
- Verify GTM container is published

**Environment variables not working?**
- Ensure variables are set for correct environment (Production/Preview)
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

## Next Steps After Deployment

1. Test all core features on live site
2. Verify GTM/GA tracking
3. Create beta launch checklist
4. Review `docs/checklist.md` for remaining items
5. Plan beta user onboarding

---

**Ready to deploy!** 🚀

