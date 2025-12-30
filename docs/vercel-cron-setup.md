# Vercel Cron Job Setup

This document explains how to set up the background job processor cron job in Vercel.

## Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/process",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

This runs every minute (`*/1 * * * *`).

## Authentication

The `/api/jobs/process` endpoint supports two authentication methods:

1. **Vercel Cron Header (Automatic)**: Vercel automatically sends `x-vercel-cron: 1` header for cron jobs
2. **Token Query Parameter (Optional)**: For manual triggers or external cron services

### Option 1: Use Vercel Cron Header (Recommended)

No additional setup needed. Vercel cron jobs are automatically authenticated.

### Option 2: Use Token Query Parameter

If you want to use a token query parameter:

1. Generate a secure token:
   ```bash
   openssl rand -hex 32
   ```

2. Set it as an environment variable in Vercel:
   - Go to Vercel Dashboard > Settings > Environment Variables
   - Add `CRON_TOKEN` with your generated token value
   - Apply to Production environment

3. Update `vercel.json` to include the token:
   ```json
   {
     "crons": [
       {
         "path": "/api/jobs/process?token=YOUR_ACTUAL_TOKEN_HERE",
         "schedule": "*/1 * * * *"
       }
     ]
   }
   ```
   
   **Note**: This hardcodes the token in the config file. For better security, use the Vercel cron header instead.

4. The API route will verify the token matches `CRON_TOKEN` environment variable

## Manual Testing

You can manually trigger the job processor:

```bash
# Using Vercel cron header (simulated)
curl -H "x-vercel-cron: 1" https://your-app.vercel.app/api/jobs/process

# Or using token (if CRON_TOKEN is set)
curl "https://your-app.vercel.app/api/jobs/process?token=your-token"
```

## Vercel Plan Requirements

- **Hobby Plan**: Up to 2 cron jobs, max once per day
- **Pro Plan**: Unlimited cron jobs, can run every minute

For every-minute execution, you need the Pro plan.

## Deployment

After setting up `vercel.json`:

1. Commit and push to your repository
2. Vercel will automatically detect the cron configuration
3. Cron jobs will start running on the next deployment

You can verify cron jobs are set up in:
- Vercel Dashboard > Your Project > Settings > Cron Jobs

