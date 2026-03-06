# Environment Variables Setup

This document outlines all required and optional environment variables for INDEX.

## Required Environment Variables

### Supabase Configuration
- **`NEXT_PUBLIC_SUPABASE_URL`**: Your Supabase project URL
  - Get this from: Supabase Dashboard > Project Settings > API > Project URL
  - Example: `https://xxxxx.supabase.co`

- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Your Supabase anonymous/public key
  - Get this from: Supabase Dashboard > Project Settings > API > Project API keys > `anon` `public`
  - This is safe to expose in client-side code (RLS protects your data)

### OpenAI API Key
- **`OPENAI_API_KEY`**: Your OpenAI API key
  - Get this from: https://platform.openai.com/api-keys
  - Used for: embeddings, LLM answers, tagging, insights extraction, digest generation

### Resend API Key (for email features)
- **`RESEND_API_KEY`**: Your Resend API key
  - Get this from: https://resend.com/api-keys
  - Used for: Weekly Digest emails, feedback emails

## Optional Environment Variables

- **`RESEND_FROM_EMAIL`**: Email address to send from (defaults to `INDEX <noreply@indexapp.co>`)
  - Example: `INDEX <noreply@yourdomain.com>`
  - Must be a verified domain in Resend

- **`NEXT_PUBLIC_APP_URL`**: Your production app URL (defaults to `http://localhost:3000`)
  - Used for: Email links in Weekly Digest
  - Example: `https://your-app.vercel.app`

- **`NEXT_PUBLIC_ENABLE_EXPERIMENTS`**: Enable experimental features (defaults to `false`)
  - Set to `true` to enable hidden features like Tags/Themes UI

- **`CRON_TOKEN`**: Secret token for Vercel cron job authentication
  - Generate a secure random string (e.g., `openssl rand -hex 32`)
  - Used to secure the `/api/jobs/process` endpoint called by Vercel cron
  - **Required for production** - cron jobs will fail without this

## Setting Up in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add each variable:
   - **Key**: The variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: The actual value
   - **Environment**: Select which environments (Production, Preview, Development)
4. Click **Save**

### Recommended Setup:
- Add all variables to **Production** and **Preview** environments
- For local development, use `.env.local` (not committed to git)

## Local Development Setup

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=INDEX <noreply@yourdomain.com>

# App URL (for local dev, this is optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: `.env.local` is already in `.gitignore` and will not be committed.

## Verification

After setting up environment variables:

1. **Local**: Restart your dev server (`npm run dev`)
2. **Vercel**: Redeploy your application (or wait for automatic redeploy)

You can verify they're loaded by checking:
- Supabase connection works (sign in/sign up)
- OpenAI features work (Ask Index, embeddings)
- Email features work (Weekly Digest generation)

