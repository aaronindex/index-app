# Vercel Deployment Troubleshooting

## Issue: Push to GitHub didn't trigger Vercel deployment

### Quick Fixes

1. **Check Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Find your `index-app` project
   - Check if there's a "Redeploy" or "Deploy" button
   - Manually trigger a deployment if needed

2. **Verify GitHub Integration**
   - Vercel Dashboard > Your Project > Settings > Git
   - Ensure GitHub is connected
   - Check that the correct repository is linked: `aaronindex/index-app`
   - Verify the branch is set to `main` (not `master`)

3. **Check Webhook Status**
   - Vercel Dashboard > Your Project > Settings > Git
   - Look for webhook status
   - If webhook is missing/broken, you may need to reconnect

4. **Manual Deployment**
   - Vercel Dashboard > Your Project > Deployments
   - Click "Redeploy" on the latest deployment, OR
   - Click "Deploy" button and select the commit

### Common Issues

**Issue: Wrong Branch**
- Vercel might be watching `master` instead of `main`
- Fix: Settings > Git > Production Branch > Set to `main`

**Issue: Webhook Not Configured**
- GitHub webhook might be missing
- Fix: Disconnect and reconnect GitHub integration in Vercel

**Issue: Repository Not Connected**
- Project might not be linked to GitHub
- Fix: Settings > Git > Connect Git Repository

**Issue: Vercel App Not Found**
- Project might not exist in Vercel
- Fix: Import project from GitHub in Vercel dashboard

### Manual Deployment Steps

If automatic deployment isn't working:

1. **Via Vercel Dashboard:**
   - Go to your project
   - Click "Deployments" tab
   - Click "Deploy" button
   - Select the commit: `f279b40 Deploy: PWA support...`
   - Click "Deploy"

2. **Via Vercel CLI (if installed):**
   ```bash
   npx vercel --prod
   ```

3. **Reconnect GitHub:**
   - Settings > Git > Disconnect
   - Reconnect and select `aaronindex/index-app`
   - Ensure `main` branch is selected

### Verify Deployment

After deployment:
- Check Vercel dashboard for build logs
- Visit https://indexapp.co to verify it's live
- Check deployment status (should show "Ready" or "Building")

