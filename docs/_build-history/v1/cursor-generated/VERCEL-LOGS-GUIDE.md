# How to Access Vercel Logs for Debugging

## Accessing Logs in Vercel Dashboard

1. **Go to your Vercel project dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project: `index-app`

2. **View Deployment Logs**
   - Click on the failed deployment
   - Go to the "Logs" tab
   - Look for errors during the build or runtime

3. **View Function Logs (Runtime)**
   - In your project dashboard, go to the "Functions" tab
   - Click on any function (especially `middleware`)
   - View "Logs" to see runtime errors
   - Look for entries with timestamps matching when the error occurred

4. **View Real-time Logs**
   - In the project dashboard, go to "Logs" in the sidebar
   - This shows real-time logs from your deployed application
   - Filter by "Error" level to see only errors

## Using Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# View logs for your project
vercel logs

# View logs for a specific deployment
vercel logs [deployment-url]

# Follow logs in real-time
vercel logs --follow
```

## What to Look For

When debugging the `__dirname` error, look for:

1. **The exact error message** - Should show `ReferenceError: __dirname is not defined`
2. **The stack trace** - This will show which file/line is causing the issue
3. **The function name** - Should indicate if it's middleware or another function
4. **The timestamp** - Helps correlate with user reports

## Common Log Locations

- **Build errors**: Deployment logs (visible in deployment details)
- **Runtime errors**: Function logs (in Functions tab or real-time logs)
- **Middleware errors**: Usually in Function logs under `middleware` or `[middleware]`

## Exporting Logs

You can export logs from Vercel dashboard:
1. Go to Logs section
2. Use the filter to find relevant errors
3. Copy the log entries or use the export feature if available

## Next Steps After Finding the Error

Once you have the full stack trace:
1. Identify which dependency is using `__dirname`
2. Check if there's an updated version that fixes Edge runtime compatibility
3. Consider adding the problematic package to `serverExternalPackages` in `next.config.ts`
4. Or wrap the problematic code in a try-catch with better error handling

